import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { notificationUpdateSchema } from "@/lib/validations/schemas";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import { recordAudit } from "@/lib/security/audit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "notifications-update", 90);
  if (!limited.ok) return limited.response;

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return jsonError(400, "That notification id is not valid.", { code: "invalid_id" });
  }

  const parsed = await parseBody(request, notificationUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await account.supabase
    .from("notifications")
    .update({ is_read: parsed.data.is_read })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonError(503, "The notification could not be updated.", {
      code: friendlyDatabaseError(error) ?? "notification_update_failed",
    });
  }
  if (!data) {
    return jsonError(404, "That notification was not found on your account.", {
      code: "notification_not_found",
    });
  }

  return jsonOk({ notification: data });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "notifications-delete", 40);
  if (!limited.ok) return limited.response;

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return jsonError(400, "That notification id is not valid.", { code: "invalid_id" });
  }

  const { data, error } = await account.supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError(503, "The notification could not be deleted.", {
      code: friendlyDatabaseError(error) ?? "notification_delete_failed",
    });
  }
  if (!data) {
    return jsonError(404, "That notification was not found on your account.", {
      code: "notification_not_found",
    });
  }

  await recordAudit(account.supabase, user.id, {
    action: "notification_deleted",
    resourceType: "notification",
    resourceId: id,
    context: limited.context,
  });

  return jsonOk({ deleted: true, id });
}
