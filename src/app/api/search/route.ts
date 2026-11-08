import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type { Invoice, Transaction } from "@/types/database";

export const runtime = "nodejs";

function safeSearch(value: string) {
  return value.replace(/[(),%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 70);
}

export async function GET(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "search", 90);
  if (!limited.ok) return limited.response;

  const query = safeSearch(new URL(request.url).searchParams.get("q") ?? "");
  if (query.length < 2) {
    return jsonOk({ query, invoices: [], transactions: [] });
  }

  const [invoiceResult, transactionResult] = await Promise.all([
    account.supabase
      .from("invoices")
      .select("id,invoice_number,customer_name,description,amount,currency,status,kind,is_demo,created_at")
      .eq("user_id", user.id)
      .or(
        `invoice_number.ilike.%${query}%,customer_name.ilike.%${query}%,description.ilike.%${query}%`
      )
      .order("created_at", { ascending: false })
      .limit(6),
    account.supabase
      .from("transactions")
      .select("id,paypal_order_id,payment_description,amount,currency,status,is_demo,created_at")
      .eq("user_id", user.id)
      .or(
        `payment_description.ilike.%${query}%,paypal_order_id.ilike.%${query}%,paypal_capture_id.ilike.%${query}%`
      )
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (invoiceResult.error || transactionResult.error) {
    return jsonError(503, "Search is not available yet.", {
      code: friendlyDatabaseError(invoiceResult.error ?? transactionResult.error) ?? "search_unavailable",
    });
  }

  const invoices = ((invoiceResult.data ?? []) as Pick<
    Invoice,
    | "id"
    | "invoice_number"
    | "customer_name"
    | "description"
    | "amount"
    | "currency"
    | "status"
    | "kind"
    | "is_demo"
    | "created_at"
  >[]).map((invoice) => ({
    ...invoice,
    amount: Number(invoice.amount),
    href: `/${invoice.kind === "invoice" ? "invoices" : "payment-requests"}?highlight=${invoice.id}`,
  }));

  const transactions = ((transactionResult.data ?? []) as Pick<
    Transaction,
    | "id"
    | "paypal_order_id"
    | "payment_description"
    | "amount"
    | "currency"
    | "status"
    | "is_demo"
    | "created_at"
  >[]).map((transaction) => ({
    ...transaction,
    amount: Number(transaction.amount),
    href: `/transactions?highlight=${transaction.id}`,
  }));

  return jsonOk({ query, invoices, transactions });
}
