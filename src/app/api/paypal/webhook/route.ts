import { after, type NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/security/http";
import { verifyWebhookSignature } from "@/lib/paypal/client";
import { settleCompletedOrder, sendPaymentReceipt } from "@/lib/paypal/orders";
import { createServiceClient } from "@/lib/supabase/service";
import { pushNotification, recordAudit } from "@/lib/security/audit";
import type { Invoice, Transaction } from "@/types/database";

export const runtime = "nodejs";

type WebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    supplementary_data?: { related_ids?: { order_id?: string } };
    payer?: { payer_id?: string };
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function amountOf(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function resolveRecords(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  orderId: string,
  invoiceHint?: string | null
) {
  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("paypal_order_id", orderId)
    .maybeSingle();

  const tx = transaction as Transaction | null;

  if (tx?.invoice_id) {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", tx.invoice_id)
      .maybeSingle();
    if (data) return { transaction: tx, invoice: data as Invoice };
  }

  const { data: byOrder } = await supabase
    .from("invoices")
    .select("*")
    .eq("paypal_order_id", orderId)
    .maybeSingle();

  if (byOrder) return { transaction: tx, invoice: byOrder as Invoice };

  if (invoiceHint && UUID.test(invoiceHint)) {
    const { data: byId } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceHint)
      .maybeSingle();
    if (byId) return { transaction: tx, invoice: byId as Invoice };
  }

  return { transaction: tx, invoice: null };
}

export async function POST(request: NextRequest) {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    return jsonError(503, "Webhook verification is not configured.", {
      code: "webhook_not_configured",
    });
  }

  const raw = await request.text();
  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    return jsonError(400, "Webhook body must be valid JSON.", { code: "invalid_json" });
  }

  const verified = await verifyWebhookSignature(request.headers, event);
  if (!verified) {
    return jsonError(401, "Webhook signature verification failed.", {
      code: "webhook_unverified",
    });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return jsonError(503, "The service role is not configured for webhook processing.", {
      code: "service_role_not_configured",
    });
  }

  const resource = event.resource ?? {};
  const orderId =
    resource.supplementary_data?.related_ids?.order_id ??
    (event.event_type === "CHECKOUT.ORDER.APPROVED" ? resource.id : undefined);
  const captureId = resource.id ?? null;
  const invoiceHint = resource.custom_id ?? null;

  if (!orderId) {
    return jsonOk({ received: true, processed: false, reason: "missing_order_id" });
  }

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const { transaction, invoice } = await resolveRecords(supabase, orderId, invoiceHint);

    if (!invoice) {
      return jsonOk({ received: true, processed: false, reason: "unknown_order" });
    }

    const amount = amountOf(resource.amount?.value);
    const currency = resource.amount?.currency_code ?? "";

    if (!captureId || resource.status !== "COMPLETED" || amount <= 0 || !currency) {
      return jsonOk({ received: true, processed: false, reason: "incomplete_capture" });
    }

    if (Math.abs(amount - Number(invoice.amount)) > 0.009 || currency !== invoice.currency) {
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          failure_reason: "Webhook capture did not match the stored request amount.",
        })
        .eq("paypal_order_id", orderId)
        .neq("status", "completed");

      await recordAudit(supabase, invoice.user_id, {
        action: "paypal_webhook_amount_mismatch",
        resourceType: "invoice",
        resourceId: invoice.id,
        metadata: {
          orderId,
          captureId,
          expected: { amount: Number(invoice.amount), currency: invoice.currency },
          received: { amount, currency },
        },
      });

      return jsonOk({ received: true, processed: false, reason: "amount_mismatch" });
    }

    try {
      const settled = await settleCompletedOrder({
        supabase,
        userId: invoice.user_id,
        invoice,
        orderId,
        captureId,
        payerId: resource.payer?.payer_id ?? null,
        amount,
        currency,
        transactionId: transaction?.id ?? null,
      });

      await recordAudit(supabase, invoice.user_id, {
        action: "paypal_webhook_capture_completed",
        resourceType: "invoice",
        resourceId: invoice.id,
        metadata: {
          orderId,
          captureId,
          amount,
          currency,
          firstSettlement: settled.firstSettlement,
          eventId: event.id ?? null,
        },
      });

      if (settled.firstSettlement) {
        after(async () => {
          await sendPaymentReceipt(supabase, invoice.user_id, {
            invoice: settled.invoice,
            orderId,
            amount,
            currency,
          });
        });
      }

      return jsonOk({
        received: true,
        processed: true,
        firstSettlement: settled.firstSettlement,
      });
    } catch {
      return jsonError(500, "The settlement could not be recorded yet.", {
        code: "settlement_failed",
      });
    }
  }

  if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
    const { transaction, invoice } = await resolveRecords(supabase, orderId, invoiceHint);

    if (transaction && transaction.status === "created") {
      await supabase
        .from("transactions")
        .update({ status: "approved" })
        .eq("id", transaction.id);
    }

    if (invoice) {
      await pushNotification(supabase, {
        userId: invoice.user_id,
        title: "Sandbox order approved",
        message: `${invoice.customer_name} approved the PayPal order for ${invoice.invoice_number}. Capture is next.`,
        type: "payment",
        link: "/transactions",
      });

      await recordAudit(supabase, invoice.user_id, {
        action: "paypal_webhook_order_approved",
        resourceType: "invoice",
        resourceId: invoice.id,
        metadata: { orderId, eventId: event.id ?? null },
      });
    }

    return jsonOk({ received: true, processed: Boolean(invoice) });
  }

  if (
    event.event_type === "PAYMENT.CAPTURE.DENIED" ||
    event.event_type === "PAYMENT.CAPTURE.REFUNDED" ||
    event.event_type === "PAYMENT.CAPTURE.REVERSED"
  ) {
    const { transaction, invoice } = await resolveRecords(supabase, orderId, invoiceHint);

    if (!invoice) {
      return jsonOk({ received: true, processed: false, reason: "unknown_order" });
    }

    const refunded = event.event_type !== "PAYMENT.CAPTURE.DENIED";

    if (transaction && transaction.status !== "completed") {
      await supabase
        .from("transactions")
        .update({
          status: refunded ? "refunded" : "failed",
          failure_reason: refunded
            ? "PayPal reported a refund or reversal."
            : "PayPal denied the capture.",
        })
        .eq("id", transaction.id);
    } else if (transaction) {
      await supabase
        .from("transactions")
        .update({
          status: "refunded",
          failure_reason: refunded ? "PayPal reported a refund or reversal." : null,
        })
        .eq("id", transaction.id);
    }

    if (refunded) {
      const refundAmount = amountOf(resource.amount?.value);
      const isFullRefund = Math.abs(refundAmount - Number(invoice.amount)) < 0.009;
      if (isFullRefund) {
        await supabase
          .from("invoices")
          .update({ status: "pending", paypal_order_id: null })
          .eq("id", invoice.id);
      }
    } else {
      await supabase
        .from("invoices")
        .update({ status: "pending" })
        .eq("id", invoice.id);
    }

    await pushNotification(supabase, {
      userId: invoice.user_id,
      title: refunded ? "Payment refunded" : "Payment denied",
      message: refunded
        ? `${invoice.invoice_number} received a refund notice from PayPal. Review the ledger before collecting again.`
        : `PayPal denied the capture for ${invoice.invoice_number}. The request is open again.`,
      type: "payment",
      link: "/transactions",
    });

    await recordAudit(supabase, invoice.user_id, {
      action: refunded ? "paypal_webhook_capture_refunded" : "paypal_webhook_capture_denied",
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: { orderId, captureId, eventId: event.id ?? null },
    });

    return jsonOk({ received: true, processed: true });
  }

  return jsonOk({ received: true, processed: false, reason: "unhandled_event" });
}
