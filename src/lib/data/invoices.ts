import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createInvoiceNumber } from "@/lib/utils/invoice-number";
import { isDatabaseSetupError } from "@/lib/security/http";
import type { Database, Invoice, InvoiceKind, InvoiceStatus } from "@/types/database";

export function friendlyDatabaseError(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (isDatabaseSetupError(error)) return "database_not_initialized";
  return "database_unavailable";
}

/** The stored status stays untouched; this is a display only correction. */
export function effectiveInvoiceStatus(invoice: Invoice, now = new Date()): InvoiceStatus {
  if (invoice.status !== "pending" || !invoice.due_date) return invoice.status;
  const due = new Date(`${invoice.due_date}T00:00:00`);
  if (Number.isNaN(due.getTime())) return invoice.status;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due.getTime() < today.getTime() ? "overdue" : invoice.status;
}

export async function insertInvoice(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    kind: InvoiceKind;
    customer_name: string;
    customer_email?: string | null;
    description?: string | null;
    notes?: string | null;
    amount: number;
    currency: Database["public"]["Tables"]["invoices"]["Row"]["currency"];
    due_date?: string | null;
    status?: InvoiceStatus;
  },
  options: { demo?: boolean } = {}
): Promise<{ invoice: Invoice | null; error: "database_not_initialized" | "database_unavailable" | "number_conflict" | null }> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const invoiceNumber = createInvoiceNumber(input.kind, { demo: options.demo });
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        kind: input.kind,
        invoice_number: invoiceNumber,
        customer_name: input.customer_name,
        customer_email: input.customer_email || null,
        description: input.description ?? "",
        notes: input.notes ?? "",
        amount: input.amount,
        currency: input.currency,
        due_date: input.due_date ?? null,
        status:
          input.status ?? (input.kind === "payment_request" ? "pending" : "draft"),
        is_demo: Boolean(options.demo),
      })
      .select("*")
      .single();

    if (!error) return { invoice: data as Invoice, error: null };
    if (error.code === "23505" && attempt < 3) continue;
    return {
      invoice: null,
      error: error.code === "23505" ? "number_conflict" : friendlyDatabaseError(error),
    };
  }

  return { invoice: null, error: "number_conflict" };
}
