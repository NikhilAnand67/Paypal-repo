import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  approvalLink,
  captureOrder,
  createOrder,
  firstCapture,
  getOrder,
  isPayPalConfigured,
  PayPalError,
  type PayPalOrder,
} from "@/lib/paypal/client";
import { pushNotification, recordAudit } from "@/lib/security/audit";
import { sendEmail } from "@/lib/email/resend";
import { paymentReceivedEmail } from "@/lib/email/templates";
import { formatCurrency } from "@/lib/utils/format";
import type { Database, Invoice, Transaction } from "@/types/database";

type RequestContext = { ip: string | null; userAgent: string | null };

export type CheckoutStart = {
  orderId: string;
  approvalUrl: string;
  invoice: Invoice;
  transactionId: string | null;
};

export type CaptureOutcome = {
  orderId: string;
  invoiceId: string;
  status: "completed" | "pending" | "failed";
  captureId: string | null;
  amount: number;
  currency: string;
  alreadySettled: boolean;
  invoice: Invoice | null;
};

function numberFromPayPal(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sameMoney(left: number, right: number) {
  return Math.abs(left - right) < 0.009;
}

function assertConfigured() {
  if (!isPayPalConfigured()) {
    throw new PayPalError(
      "PayPal Sandbox is not configured on this deployment yet.",
      503,
      "paypal_not_configured"
    );
  }
}

function assertInvoiceCollectable(invoice: Invoice) {
  if (invoice.status === "paid") {
    throw new PayPalError("This request is already paid.", 409, "invoice_already_paid");
  }
  if (invoice.status === "cancelled") {
    throw new PayPalError("This request was cancelled.", 409, "invoice_cancelled");
  }
  if (!["draft", "pending", "overdue"].includes(invoice.status)) {
    throw new PayPalError("This request is not open for payment.", 409, "invoice_not_open");
  }
  const amount = Number(invoice.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PayPalError("The request amount is not valid.", 400, "invalid_amount");
  }
}

/**
 * Creates a sandbox order for an invoice the signed in user owns. The amount
 * and currency are read from the database, never from the browser.
 */
export async function startInvoiceCheckout(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  invoiceId: string;
  actor: "user" | "agent";
  context?: RequestContext;
}): Promise<CheckoutStart> {
  assertConfigured();

  const { data, error } = await params.supabase
    .from("invoices")
    .select("*")
    .eq("id", params.invoiceId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error) {
    throw new PayPalError("The payment request could not be loaded.", 500, "invoice_unavailable");
  }
  if (!data) {
    throw new PayPalError("That payment request was not found.", 404, "invoice_not_found");
  }

  const invoice = data as Invoice;
  assertInvoiceCollectable(invoice);
  const amount = Number(invoice.amount);

  const order = await createOrder({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    amount,
    currency: invoice.currency,
    description: invoice.description || `Payment for ${invoice.invoice_number}`,
  });

  const approval = approvalLink(order);
  if (!order.id || !approval) {
    throw new PayPalError(
      "PayPal did not return an approval link for this order.",
      502,
      "paypal_no_approval_link"
    );
  }

  const { error: invoiceError } = await params.supabase
    .from("invoices")
    .update({
      paypal_order_id: order.id,
      status: invoice.status === "draft" ? "pending" : invoice.status,
    })
    .eq("id", invoice.id)
    .eq("user_id", params.userId);

  if (invoiceError) {
    throw new PayPalError("The order was created but the ledger could not be updated.", 500, "ledger_update_failed");
  }

  const { data: transaction, error: transactionError } = await params.supabase
    .from("transactions")
    .upsert(
      {
        user_id: params.userId,
        invoice_id: invoice.id,
        paypal_order_id: order.id,
        amount,
        currency: invoice.currency,
        status: "created",
        payment_provider: "paypal",
        payment_description: invoice.description || invoice.invoice_number,
        is_demo: invoice.is_demo,
      },
      { onConflict: "paypal_order_id" }
    )
    .select("*")
    .maybeSingle();

  if (transactionError) {
    throw new PayPalError("The order exists but the transaction record failed.", 500, "ledger_update_failed");
  }

  await recordAudit(params.supabase, params.userId, {
    action: "paypal_order_created",
    resourceType: "invoice",
    resourceId: invoice.id,
    metadata: {
      orderId: order.id,
      amount,
      currency: invoice.currency,
      actor: params.actor,
      demo: invoice.is_demo,
    },
    context: params.context,
  });

  return {
    orderId: order.id,
    approvalUrl: approval,
    invoice: { ...invoice, paypal_order_id: order.id },
    transactionId: (transaction as Transaction | null)?.id ?? null,
  };
}

async function loadOwnedOrderRecords(
  supabase: SupabaseClient<Database>,
  userId: string,
  orderId: string
) {
  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("paypal_order_id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  const row = transaction as Transaction | null;

  if (row?.invoice_id) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", row.invoice_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (invoice) return { transaction: row, invoice: invoice as Invoice };
  }

  const { data: invoiceByOrder } = await supabase
    .from("invoices")
    .select("*")
    .eq("paypal_order_id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (invoiceByOrder) {
    return { transaction: row, invoice: invoiceByOrder as Invoice };
  }

  return { transaction: row, invoice: null };
}

function assertOrderMatchesInvoice(order: PayPalOrder, invoice: Invoice) {
  const unit = order.purchase_units?.[0];
  const reference = unit?.custom_id || unit?.reference_id;
  if (reference && reference !== invoice.id) {
    throw new PayPalError(
      "This PayPal order is linked to a different request.",
      409,
      "order_mismatch"
    );
  }

  const orderAmount = numberFromPayPal(unit?.amount?.value);
  const orderCurrency = unit?.amount?.currency_code;
  if (!sameMoney(orderAmount, Number(invoice.amount)) || orderCurrency !== invoice.currency) {
    throw new PayPalError(
      "The PayPal order amount does not match the stored request. Nothing was recorded.",
      409,
      "amount_mismatch"
    );
  }
}

/**
 * Captures an approved sandbox order and records the settlement exactly once.
 * The browser's claimed amount is ignored entirely.
 */
export async function captureInvoiceOrder(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  orderId: string;
  context?: RequestContext;
}): Promise<CaptureOutcome> {
  assertConfigured();

  const { transaction, invoice } = await loadOwnedOrderRecords(
    params.supabase,
    params.userId,
    params.orderId
  );

  if (!invoice) {
    throw new PayPalError(
      "That PayPal order does not belong to a request on this account.",
      404,
      "order_not_found"
    );
  }

  if (transaction?.status === "completed" && invoice.status === "paid") {
    return {
      orderId: params.orderId,
      invoiceId: invoice.id,
      status: "completed",
      captureId: transaction.paypal_capture_id,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      alreadySettled: true,
      invoice,
    };
  }

  let order: PayPalOrder;
  try {
    const current = await getOrder(params.orderId);
    assertOrderMatchesInvoice(current, invoice);

    if (current.status === "COMPLETED") {
      order = current;
    } else if (current.status !== "APPROVED") {
      throw new PayPalError(
        `PayPal reports this order as ${current.status}. Approve it before capturing.`,
        409,
        "order_not_approved"
      );
    } else {
      order = await captureOrder(params.orderId);
      assertOrderMatchesInvoice(order, invoice);
    }
  } catch (error) {
    if (
      error instanceof PayPalError &&
      (error.code === "ORDER_ALREADY_CAPTURED" || error.status === 422)
    ) {
      order = await getOrder(params.orderId);
      assertOrderMatchesInvoice(order, invoice);
    } else {
      throw error;
    }
  }

  const capture = firstCapture(order);
  if (order.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
    if (transaction) {
      await params.supabase
        .from("transactions")
        .update({ status: "approved" })
        .eq("id", transaction.id)
        .eq("user_id", params.userId);
    }
    return {
      orderId: order.id,
      invoiceId: invoice.id,
      status: "pending",
      captureId: capture?.id ?? null,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      alreadySettled: false,
      invoice,
    };
  }

  const capturedAmount = numberFromPayPal(capture.amount?.value);
  const capturedCurrency = capture.amount?.currency_code;
  if (!sameMoney(capturedAmount, Number(invoice.amount)) || capturedCurrency !== invoice.currency) {
    await params.supabase
      .from("transactions")
      .update({
        status: "failed",
        failure_reason: "Captured amount did not match the stored request.",
      })
      .eq("paypal_order_id", order.id)
      .eq("user_id", params.userId);
    throw new PayPalError(
      "The captured amount did not match the request. The payment was not marked paid.",
      409,
      "amount_mismatch"
    );
  }

  const settled = await settleCompletedOrder({
    supabase: params.supabase,
    userId: params.userId,
    invoice,
    orderId: order.id,
    captureId: capture.id,
    payerId: order.payer?.payer_id ?? null,
    amount: capturedAmount,
    currency: capturedCurrency,
    transactionId: transaction?.id ?? null,
  });

  await recordAudit(params.supabase, params.userId, {
    action: "paypal_order_captured",
    resourceType: "invoice",
    resourceId: invoice.id,
    metadata: {
      orderId: order.id,
      captureId: capture.id,
      amount: capturedAmount,
      currency: capturedCurrency,
      firstSettlement: settled.firstSettlement,
      demo: invoice.is_demo,
    },
    context: params.context,
  });

  return {
    orderId: order.id,
    invoiceId: invoice.id,
    status: "completed",
    captureId: capture.id,
    amount: capturedAmount,
    currency: capturedCurrency,
    alreadySettled: !settled.firstSettlement,
    invoice: settled.invoice,
  };
}

/** Marks the invoice paid and the transaction completed. Safe to retry. */
export async function settleCompletedOrder(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  invoice: Invoice;
  orderId: string;
  captureId: string;
  payerId?: string | null;
  amount: number;
  currency: string;
  transactionId?: string | null;
}): Promise<{ firstSettlement: boolean; invoice: Invoice; transaction: Transaction | null }> {
  const { data: existing } = await params.supabase
    .from("transactions")
    .select("*")
    .eq("paypal_order_id", params.orderId)
    .eq("user_id", params.userId)
    .maybeSingle();

  const current = existing as Transaction | null;
  const firstSettlement = current?.status !== "completed";

  const { data: transaction, error: transactionError } = await params.supabase
    .from("transactions")
    .upsert(
      {
        user_id: params.userId,
        invoice_id: params.invoice.id,
        paypal_order_id: params.orderId,
        paypal_capture_id: params.captureId,
        paypal_payer_id: params.payerId ?? null,
        amount: params.amount,
        currency: params.currency as Invoice["currency"],
        status: "completed",
        payment_provider: "paypal",
        payment_description: params.invoice.description || params.invoice.invoice_number,
        failure_reason: null,
        is_demo: params.invoice.is_demo,
      },
      { onConflict: "paypal_order_id" }
    )
    .select("*")
    .maybeSingle();

  if (transactionError) {
    throw new PayPalError(
      "PayPal captured the order but the ledger update failed.",
      500,
      "ledger_update_failed"
    );
  }

  const { data: updatedInvoice, error: invoiceError } = await params.supabase
    .from("invoices")
    .update({ status: "paid", paypal_order_id: params.orderId })
    .eq("id", params.invoice.id)
    .eq("user_id", params.userId)
    .select("*")
    .maybeSingle();

  if (invoiceError) {
    throw new PayPalError(
      "PayPal captured the order but the request could not be marked paid.",
      500,
      "ledger_update_failed"
    );
  }

  if (firstSettlement) {
    await pushNotification(params.supabase, {
      userId: params.userId,
      title: "Payment received",
      message: `${formatCurrency(params.amount, params.currency)} from ${params.invoice.customer_name} was captured through PayPal.`,
      type: "payment",
      link: "/transactions",
    });
  }

  return {
    firstSettlement,
    invoice: (updatedInvoice as Invoice | null) ?? params.invoice,
    transaction: transaction as Transaction | null,
  };
}

/** Sends the receipt to the verified account email, never to a client input. */
export async function sendPaymentReceipt(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    invoice: Invoice;
    orderId: string;
    amount: number;
    currency: string;
  }
) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email,full_name,payment_notifications")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.email || profile.payment_notifications === false) return;

    const template = paymentReceivedEmail({
      name: profile.full_name || profile.email.split("@")[0],
      amount: input.amount,
      currency: input.currency,
      customer: input.invoice.customer_name,
      orderId: input.orderId,
      invoiceNumber: input.invoice.invoice_number,
      demo: input.invoice.is_demo,
    });

    await sendEmail({
      to: profile.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch {
    // Receipts are best effort and must not undo a captured payment.
  }
}
