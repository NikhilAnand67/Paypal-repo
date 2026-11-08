import { after, type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { invoiceCreateSchema } from "@/lib/validations/schemas";
import { insertInvoice, friendlyDatabaseError } from "@/lib/data/invoices";
import { recordAudit, pushNotification } from "@/lib/security/audit";
import { sendEmail } from "@/lib/email/resend";
import { invoiceCreatedEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/config/status";
import { displayName } from "@/lib/auth/account";
import type { Invoice, InvoiceKind, InvoiceStatus } from "@/types/database";

export const runtime = "nodejs";

function safeSearch(value: string) {  return value.replace(/[(),%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function dateParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function GET(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const user = account.user!;
  const params = new URL(request.url).searchParams;

  const limit = Math.min(Math.max(Number(params.get("limit") ?? 50) || 50, 1), 200);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);

  let query = account.supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  const kind = params.get("kind");
  if (kind === "invoice" || kind === "payment_request") {
    query = query.eq("kind", kind as InvoiceKind);
  }

  const status = params.get("status");
  if (status === "overdue") {
    const today = new Date().toISOString().slice(0, 10);
    query = query.or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${today})`);
  } else if (
    status &&
    ["draft", "pending", "paid", "cancelled"].includes(status)
  ) {
    query = query.eq("status", status as InvoiceStatus);
  }

  const search = params.get("q") ? safeSearch(params.get("q")!) : "";
  if (search) {
    query = query.or(
      `invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  const from = dateParam(params.get("from"));
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  const to = dateParam(params.get("to"));
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const min = Number(params.get("min"));
  if (Number.isFinite(min) && min > 0) query = query.gte("amount", min);
  const max = Number(params.get("max"));
  if (Number.isFinite(max) && max > 0) query = query.lte("amount", max);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return jsonError(503, "Invoices are not available yet.", {
      code: friendlyDatabaseError(error) ?? "invoices_unavailable",
    });
  }

  return jsonOk({
    invoices: (data ?? []) as Invoice[],
    count: count ?? 0,
    limit,
    offset,
  });
}

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "invoices-create", 30);
  if (!limited.ok) return limited.response;

  const parsed = await parseBody(request, invoiceCreateSchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.status === "paid") {
    return jsonError(400, "Payments are marked paid only after a verified PayPal capture.", {
      code: "manual_paid_not_allowed",
    });
  }

  const created = await insertInvoice(account.supabase, user.id, {
    kind: parsed.data.kind,
    customer_name: parsed.data.customer_name,
    customer_email: parsed.data.customer_email || null,
    description: parsed.data.description ?? "",
    notes: parsed.data.notes ?? "",
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    due_date: parsed.data.due_date ?? null,
    status: parsed.data.status,
  });

  if (!created.invoice) {
    return jsonError(503, "The record could not be saved.", {
      code: created.error ?? "invoice_not_saved",
    });
  }

  const invoice = created.invoice;
  const isInvoice = invoice.kind === "invoice";

  await recordAudit(account.supabase, user.id, {
    action: isInvoice ? "invoice_created" : "payment_request_created",
    resourceType: "invoice",
    resourceId: invoice.id,
    metadata: {
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      via: "manual",
    },
    context: limited.context,
  });

  await pushNotification(account.supabase, {
    userId: user.id,
    title: isInvoice ? "Invoice saved" : "Payment request created",
    message: `${invoice.invoice_number} for ${invoice.customer_name} is ready.`,
    type: "invoice",
    link: isInvoice ? `/invoices?highlight=${invoice.id}` : `/payment-requests?highlight=${invoice.id}`,
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
        url: `${appUrl()}/${isInvoice ? "invoices" : "payment-requests"}?highlight=${invoice.id}`,
      });
      await sendEmail({
        to: user.email!,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    });
  }

  return jsonOk({ invoice }, 201);
}
