import { type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { getNotifications } from "@/lib/data/workspace";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 50) || 50, 1), 200);
  const result = await getNotifications(account.supabase, account.user!.id, limit);

  if (result.error) {
    return jsonError(503, "Notifications are not available yet.", { code: result.error });
  }

  return jsonOk({
    notifications: result.notifications,
    unreadCount: result.notifications.filter((row) => !row.is_read).length,
  });
}
