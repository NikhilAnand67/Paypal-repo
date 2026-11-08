import { type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type { Invoice, Transaction } from "@/types/database";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return jsonError(400, "That transaction id is not valid.", { code: "invalid_id" });
  }

  const user = account.user!;
  const { data, error } = await account.supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(503, "The transaction is not available yet.", {
      code: friendlyDatabaseError(error) ?? "transaction_unavailable",
    });
  }
  if (!data) {
    return jsonError(404, "That transaction was not found on your account.", {
      code: "transaction_not_found",
    });
  }

  const transaction = data as Transaction;
  let invoice: Invoice | null = null;
  if (transaction.invoice_id) {
    const { data: invoiceRow } = await account.supabase
      .from("invoices")
      .select("*")
      .eq("id", transaction.invoice_id)
      .eq("user_id", user.id)
      .maybeSingle();
    invoice = (invoiceRow as Invoice | null) ?? null;
  }

  return jsonOk({ transaction, invoice });
}
