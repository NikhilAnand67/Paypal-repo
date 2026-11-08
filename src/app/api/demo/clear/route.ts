import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonOk } from "@/lib/security/http";
import { recordAudit } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "demo-clear", 6, 60_000);
  if (!limited.ok) return limited.response;

  const supabase = account.supabase;

  const { error: transactionError, count: transactions } = await supabase
    .from("transactions")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("is_demo", true);

  const { error: invoiceError, count: invoices } = await supabase
    .from("invoices")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("is_demo", true);

  const { count: notifications } = await supabase
    .from("notifications")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("is_demo", true);

  await recordAudit(supabase, user.id, {
    action: "demo_data_cleared",
    resourceType: "demo_ledger",
    metadata: {
      invoices: invoices ?? 0,
      transactions: transactions ?? 0,
      notifications: notifications ?? 0,
      invoiceError: invoiceError?.code ?? null,
      transactionError: transactionError?.code ?? null,
    },
    context: limited.context,
  });

  if (invoiceError || transactionError) {
    return jsonOk({
      cleared: false,
      counts: { invoices: invoices ?? 0, transactions: transactions ?? 0, notifications: notifications ?? 0 },
      message:
        "Some demonstration rows could not be removed. Real records are never touched, so try again in a moment.",
    });
  }

  return jsonOk({
    cleared: true,
    counts: { invoices: invoices ?? 0, transactions: transactions ?? 0, notifications: notifications ?? 0 },
    message: "Demonstration records were removed. Real sandbox records stay untouched.",
  });
}
