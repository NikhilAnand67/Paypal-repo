import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { paypalCreateOrderSchema } from "@/lib/validations/schemas";
import { startInvoiceCheckout } from "@/lib/paypal/orders";
import { PayPalError } from "@/lib/paypal/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "paypal-create", 20);
  if (!limited.ok) return limited.response;

  const parsed = await parseBody(request, paypalCreateOrderSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const checkout = await startInvoiceCheckout({
      supabase: account.supabase,
      userId: user.id,
      invoiceId: parsed.data.invoiceId,
      actor: "user",
      context: limited.context,
    });

    return jsonOk({
      orderId: checkout.orderId,
      approvalUrl: checkout.approvalUrl,
      invoiceId: checkout.invoice.id,
      invoiceNumber: checkout.invoice.invoice_number,
      amount: Number(checkout.invoice.amount),
      currency: checkout.invoice.currency,
    });
  } catch (error) {
    if (error instanceof PayPalError) {
      return jsonError(error.status, error.message, { code: error.code });
    }
    return jsonError(502, "The PayPal order could not be created.", {
      code: "paypal_order_failed",
    });
  }
}
