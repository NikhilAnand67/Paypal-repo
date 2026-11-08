import { after, type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { executeActionSchema, invoiceCreateSchema, type ActionOverrides } from "@/lib/validations/schemas";
import { insertInvoice, friendlyDatabaseError } from "@/lib/data/invoices";
import { startInvoiceCheckout } from "@/lib/paypal/orders";
import { PayPalError } from "@/lib/paypal/client";
import { pushNotification, recordAudit } from "@/lib/security/audit";
import { sendEmail } from "@/lib/email/resend";
import { invoiceCreatedEmail, paymentReminderEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/config/status";
import { displayName } from "@/lib/auth/account";
import type {
  ActionMetadata,
  AgentAction,
  AgentActionPayload,
  AgentExecutionStatus,
  AgentResultSummary,
  Invoice,
  Json,
} from "@/types/database";

export const runtime = "nodejs";

const CONFIRMATION_WINDOW_MS = 24 * 60 * 60 * 1000;

function mergePayload(payload: AgentActionPayload, overrides?: ActionOverrides): AgentActionPayload {
  if (!overrides) return payload;
  const merged: AgentActionPayload = { ...payload };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

async function updateActionState(params: {
  supabase: Awaited<ReturnType<typeof requireApiUser>>["account"]["supabase"];
  userId: string;
  actionId: string;
  status: AgentExecutionStatus;
  proposal: AgentActionPayload;
  result?: AgentResultSummary | Json | null;
  error?: string | null;
  confirmedAt?: string | null;
}) {
  const now = new Date().toISOString();

  await params.supabase
    .from("agent_actions")
    .update({
      execution_status: params.status,
      executed_at: params.status === "executed" ? now : null,
      confirmation_timestamp: params.confirmedAt ?? now,
      action_payload: params.proposal,
      result_payload: (params.result ?? null) as Json,
    })
    .eq("id", params.actionId)
    .eq("user_id", params.userId);

  const { data: message } = await params.supabase
    .from("agent_messages")
    .select("id,action_metadata")
    .eq("user_id", params.userId)
    .contains("action_metadata", { action_id: params.actionId })
    .maybeSingle();

  if (message) {
    const existing = (message.action_metadata ?? {}) as ActionMetadata;
    const metadata: ActionMetadata = {
      ...existing,
      action_id: params.actionId,
      status: params.status,
      proposal: params.proposal,
      result: (params.result as AgentResultSummary | null) ?? null,
      error: params.error ?? null,
    };
    await params.supabase
      .from("agent_messages")
      .update({ action_metadata: metadata })
      .eq("id", message.id)
      .eq("user_id", params.userId);
  }
}

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "ai-execute", 12);
  if (!limited.ok) return limited.response;

  const parsed = await parseBody(request, executeActionSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = account.supabase;
  const { actionId, overrides } = parsed.data;

  const { data: actionRow, error: actionError } = await supabase
    .from("agent_actions")
    .select("*")
    .eq("id", actionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (actionError) {
    return jsonError(503, "The action could not be loaded.", {
      code: friendlyDatabaseError(actionError) ?? "action_unavailable",
    });
  }

  if (!actionRow) {
    return jsonError(404, "That action was not found on your account.", {
      code: "action_not_found",
    });
  }

  const action = actionRow as AgentAction;

  if (action.execution_status !== "pending_confirmation") {
    return jsonError(409, "This action is no longer waiting for confirmation.", {
      code: "action_not_pending",
      details: { status: action.execution_status },
    });
  }

  if (Date.now() - new Date(action.created_at).getTime() > CONFIRMATION_WINDOW_MS) {
    await updateActionState({
      supabase,
      userId: user.id,
      actionId: action.id,
      status: "expired",
      proposal: action.action_payload,
      error: "This preview expired after 24 hours.",
    });
    await recordAudit(supabase, user.id, {
      action: "agent_action_expired",
      resourceType: "agent_action",
      resourceId: action.id,
      context: limited.context,
    });
    return jsonError(410, "This preview expired. Ask the agent to prepare it again.", {
      code: "action_expired",
    });
  }

  const proposal = mergePayload(action.action_payload, overrides);
  const confirmedAt = new Date().toISOString();

  if (proposal.type === "create_invoice" || proposal.type === "create_payment_request") {
    const kind = proposal.type === "create_payment_request" ? "payment_request" : "invoice";
    const validation = invoiceCreateSchema.safeParse({
      kind,
      customer_name: proposal.customer_name ?? "",
      customer_email: proposal.customer_email ?? undefined,
      description: proposal.description ?? undefined,
      amount: proposal.amount,
      currency: proposal.currency ?? account.profile?.currency ?? "USD",
      due_date: proposal.due_date ?? undefined,
      status: kind === "payment_request" ? "pending" : "draft",
    });

    if (!validation.success) {
      return jsonError(400, "A few details are still needed before this can run.", {
        code: "incomplete_action",
        details: validation.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const created = await insertInvoice(supabase, user.id, {
      kind,
      customer_name: validation.data.customer_name,
      customer_email: validation.data.customer_email || null,
      description: validation.data.description ?? "",
      notes: validation.data.notes ?? "",
      amount: validation.data.amount,
      currency: validation.data.currency,
      due_date: validation.data.due_date ?? null,
      status: validation.data.status,
    });

    if (!created.invoice) {
      await updateActionState({
        supabase,
        userId: user.id,
        actionId: action.id,
        status: "failed",
        proposal,
        error: "The record could not be saved.",
        confirmedAt,
      });
      return jsonError(503, "The record could not be saved.", {
        code: created.error ?? "invoice_not_saved",
      });
    }

    const invoice = created.invoice;
    const summary: AgentResultSummary = {
      invoiceId: invoice.id,
      kind: invoice.kind,
      status: invoice.status,
      message:
        invoice.kind === "invoice"
          ? `${invoice.invoice_number} is saved as a draft. Nothing was sent through PayPal.`
          : `${invoice.invoice_number} is saved. Share it or open PayPal checkout when you are ready.`,
    };

    await updateActionState({
      supabase,
      userId: user.id,
      actionId: action.id,
      status: "executed",
      proposal,
      result: summary,
      confirmedAt,
    });

    await recordAudit(supabase, user.id, {
      action: invoice.kind === "invoice" ? "invoice_created" : "payment_request_created",
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoice_number,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        via: "ai_agent",
        actionId: action.id,
      },
      context: limited.context,
    });

    await pushNotification(supabase, {
      userId: user.id,
      title: invoice.kind === "invoice" ? "Invoice drafted by the agent" : "Payment request ready",
      message: `${invoice.invoice_number} for ${invoice.customer_name} is saved. Review it before sharing.`,
      type: "invoice",
      link: invoice.kind === "invoice" ? `/invoices?highlight=${invoice.id}` : `/payment-requests?highlight=${invoice.id}`,
    });

    if (account.profile?.email_notifications !== false && user.email) {
      after(async () => {
        const template = invoiceCreatedEmail({
          name: displayName(user, account.profile),
          kind: invoice.kind,
          invoiceNumber: invoice.invoice_number,
          customer: invoice.customer_name,
          amount: Number(invoice.amount),
          currency: invoice.currency,
          dueDate: invoice.due_date,
          url: `${appUrl()}/${invoice.kind === "invoice" ? "invoices" : "payment-requests"}?highlight=${invoice.id}`,
        });
        await sendEmail({
          to: user.email!,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      });
    }

    return jsonOk({
      status: "executed",
      actionId: action.id,
      invoice,
      message: summary.message,
    });
  }

  if (proposal.type === "send_reminder") {
    if (!proposal.invoice_id) {
      return jsonError(400, "Choose an open request before sending a reminder.", {
        code: "incomplete_action",
      });
    }

    const { data: invoiceRow, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", proposal.invoice_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return jsonError(503, "The request could not be loaded.", {
        code: friendlyDatabaseError(error) ?? "invoice_unavailable",
      });
    }
    if (!invoiceRow) {
      return jsonError(404, "That request was not found on your account.", {
        code: "invoice_not_found",
      });
    }

    const invoice = invoiceRow as Invoice;
    if (invoice.status === "paid") {
      return jsonError(409, "This request is already paid. There is nothing to remind.", {
        code: "invoice_already_paid",
      });
    }
    if (invoice.status === "cancelled") {
      return jsonError(409, "This request was cancelled.", { code: "invoice_cancelled" });
    }

    const recipient = overrides?.customer_email || invoice.customer_email;
    if (!recipient) {
      return jsonError(400, "Add the customer email in the preview before sending.", {
        code: "customer_email_required",
      });
    }

    const template = paymentReminderEmail({
      customer: invoice.customer_name,
      senderName: displayName(user, account.profile),
      reference: invoice.invoice_number,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      dueDate: invoice.due_date,
      payUrl: `${appUrl()}/payment-requests?highlight=${invoice.id}`,
    });

    const email = await sendEmail({
      to: recipient,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: user.email ?? undefined,
    });

    if (!email.sent) {
      if (email.skipped === "not_configured") {
        return jsonError(503, "Email delivery is not configured yet. Add RESEND_API_KEY, then confirm again.", {
          code: "email_not_configured",
        });
      }
      await updateActionState({
        supabase,
        userId: user.id,
        actionId: action.id,
        status: "failed",
        proposal,
        error: "The reminder email could not be delivered.",
        confirmedAt,
      });
      return jsonError(502, "The reminder email could not be delivered. Nothing was recorded as sent.", {
        code: "email_failed",
      });
    }

    const summary: AgentResultSummary = {
      invoiceId: invoice.id,
      emailSent: true,
      message: `Reminder sent to ${recipient} for ${invoice.invoice_number}.`,
    };

    await updateActionState({
      supabase,
      userId: user.id,
      actionId: action.id,
      status: "executed",
      proposal,
      result: summary,
      confirmedAt,
    });

    await recordAudit(supabase, user.id, {
      action: "payment_reminder_sent",
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: { actionId: action.id, recipientDomain: recipient.split("@")[1] ?? null },
      context: limited.context,
    });

    await pushNotification(supabase, {
      userId: user.id,
      title: "Reminder sent",
      message: `${invoice.invoice_number} reminder went to ${recipient}.`,
      type: "reminder",
      link: "/payment-requests",
    });

    return jsonOk({
      status: "executed",
      actionId: action.id,
      invoice,
      emailSent: true,
      message: summary.message,
    });
  }

  if (proposal.type === "collect_payment") {
    if (!proposal.invoice_id) {
      return jsonError(400, "Choose a payment request before starting checkout.", {
        code: "incomplete_action",
      });
    }

    try {
      const checkout = await startInvoiceCheckout({
        supabase,
        userId: user.id,
        invoiceId: proposal.invoice_id,
        actor: "agent",
        context: limited.context,
      });

      const summary: AgentResultSummary = {
        invoiceId: checkout.invoice.id,
        kind: checkout.invoice.kind,
        status: checkout.invoice.status,
        paymentRequestUrl: checkout.approvalUrl,
        message: `PayPal sandbox checkout is ready for ${checkout.invoice.invoice_number}. Approval opens in a new tab, then the server captures the order.`,
      };

      await updateActionState({
        supabase,
        userId: user.id,
        actionId: action.id,
        status: "executed",
        proposal,
        result: summary,
        confirmedAt,
      });

      await pushNotification(supabase, {
        userId: user.id,
        title: "PayPal checkout ready",
        message: `Open the sandbox approval for ${checkout.invoice.invoice_number}.`,
        type: "payment",
        link: `/payment-requests?highlight=${checkout.invoice.id}&paypal=approve`,
      });

      return jsonOk({
        status: "executed",
        actionId: action.id,
        invoice: checkout.invoice,
        orderId: checkout.orderId,
        paymentRequestUrl: checkout.approvalUrl,
        message: summary.message,
      });
    } catch (error) {
      if (error instanceof PayPalError) {
        const keepPending = error.code === "paypal_not_configured";
        if (!keepPending) {
          await updateActionState({
            supabase,
            userId: user.id,
            actionId: action.id,
            status: "failed",
            proposal,
            error: error.message,
            confirmedAt,
          });
        }
        return jsonError(error.status, error.message, { code: error.code });
      }
      await updateActionState({
        supabase,
        userId: user.id,
        actionId: action.id,
        status: "failed",
        proposal,
        error: "PayPal checkout could not be prepared.",
        confirmedAt,
      });
      return jsonError(502, "PayPal checkout could not be prepared.", {
        code: "paypal_checkout_failed",
      });
    }
  }

  return jsonError(400, "This action type is not supported.", { code: "unsupported_action" });
}
