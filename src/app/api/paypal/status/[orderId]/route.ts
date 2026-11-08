import { type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { getOrder, PayPalError } from "@/lib/paypal/client";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type { Invoice, Transaction } from "@/types/database";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const { orderId } = await context.params;
  const user = account.user!;

  const { data: transaction, error } = await account.supabase
    .from("transactions")
    .select("*")
    .eq("paypal_order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(503, "The order is not available yet.", {
      code: friendlyDatabaseError(error) ?? "order_unavailable",
    });
  }

  let invoice: Invoice | null = null;
  if (transaction?.invoice_id) {
    const { data } = await account.supabase
      .from("invoices")
      .select("*")
      .eq("id", transaction.invoice_id)
      .eq("user_id", user.id)
      .maybeSingle();
    invoice = (data as Invoice | null) ?? null;
  }

  if (!transaction && !invoice) {
    return jsonError(404, "That PayPal order was not found on your account.", {
      code: "order_not_found",
    });
  }

  let remoteStatus: string | null = null;
  let remoteAmount: number | null = null;
  let remoteCurrency: string | null = null;
  let remoteAvailable = false;

  try {
    const order = await getOrder(orderId);
    remoteAvailable = true;
    remoteStatus = order.status;
    const unit = order.purchase_units?.[0];
    remoteAmount = Number(unit?.amount?.value ?? 0) || null;
    remoteCurrency = unit?.amount?.currency_code ?? null;
  } catch (error) {
    if (!(error instanceof PayPalError)) {
      remoteStatus = null;
    }
  }

  return jsonOk({
    orderId,
    localStatus: (transaction as Transaction | null)?.status ?? null,
    localAmount: transaction ? Number(transaction.amount) : null,
    localCurrency: transaction?.currency ?? null,
    invoiceStatus: invoice?.status ?? null,
    invoiceNumber: invoice?.invoice_number ?? null,
    remoteStatus,
    remoteAmount,
    remoteCurrency,
    remoteAvailable,
  });
}
