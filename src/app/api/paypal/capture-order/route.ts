import { after, type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { paypalCaptureOrderSchema } from "@/lib/validations/schemas";
import { captureInvoiceOrder, sendPaymentReceipt } from "@/lib/paypal/orders";
import { PayPalError } from "@/lib/paypal/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "paypal-capture", 20);
  if (!limited.ok) return limited.response;

  const parsed = await parseBody(request, paypalCaptureOrderSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const outcome = await captureInvoiceOrder({
      supabase: account.supabase,
      userId: user.id,
      orderId: parsed.data.orderId,
      context: limited.context,
    });

    if (outcome.status === "completed" && !outcome.alreadySettled && outcome.invoice) {
      after(async () => {
        await sendPaymentReceipt(account.supabase, user.id, {
          invoice: outcome.invoice!,
          orderId: outcome.orderId,
          amount: outcome.amount,
          currency: outcome.currency,
        });
      });
    }

    return jsonOk({
      orderId: outcome.orderId,
      invoiceId: outcome.invoiceId,
      status: outcome.status,
      captureId: outcome.captureId,
      amount: outcome.amount,
      currency: outcome.currency,
      alreadySettled: outcome.alreadySettled,
      invoice: outcome.invoice,
    });
  } catch (error) {
    if (error instanceof PayPalError) {
      return jsonError(error.status, error.message, { code: error.code });
    }
    return jsonError(502, "PayPal could not capture this order.", {
      code: "paypal_capture_failed",
    });
  }
}
