import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { friendlyDatabaseError } from "@/lib/data/invoices";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "notifications-read-all", 20);
  if (!limited.ok) return limited.response;

  const { data, error } = await account.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .select("id");

  if (error) {
    return jsonError(503, "Notifications could not be updated.", {
      code: friendlyDatabaseError(error) ?? "notification_update_failed",
    });
  }

  return jsonOk({ updated: data?.length ?? 0 });
}
