import { type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type { Invoice, Transaction, TransactionStatus } from "@/types/database";

export const runtime = "nodejs";

function safeSearch(value: string) {
  return value.replace(/[(),%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function dateParam(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const user = account.user!;
  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 50) || 50, 1), 200);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);

  let query = account.supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  const status = params.get("status");
  if (status && ["created", "approved", "completed", "failed", "refunded"].includes(status)) {
    query = query.eq("status", status as TransactionStatus);
  }

  const search = params.get("q") ? safeSearch(params.get("q")!) : "";
  if (search) {
    query = query.or(
      `payment_description.ilike.%${search}%,paypal_order_id.ilike.%${search}%,paypal_capture_id.ilike.%${search}%`
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

  const invoiceId = params.get("invoiceId");
  if (invoiceId && /^[0-9a-f-]{36}$/i.test(invoiceId)) {
    query = query.eq("invoice_id", invoiceId);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return jsonError(503, "Transactions are not available yet.", {
      code: friendlyDatabaseError(error) ?? "transactions_unavailable",
    });
  }

  const transactions = (data ?? []) as Transaction[];
  const invoiceIds = [...new Set(transactions.map((row) => row.invoice_id).filter(Boolean))] as string[];

  let invoices: Pick<Invoice, "id" | "invoice_number" | "customer_name" | "kind">[] = [];
  if (invoiceIds.length) {
    const { data: invoiceRows } = await account.supabase
      .from("invoices")
      .select("id,invoice_number,customer_name,kind")
      .eq("user_id", user.id)
      .in("id", invoiceIds);
    invoices = (invoiceRows ?? []) as Pick<
      Invoice,
      "id" | "invoice_number" | "customer_name" | "kind"
    >[];
  }

  return jsonOk({
    transactions,
    invoices,
    count: count ?? 0,
    limit,
    offset,
  });
}
