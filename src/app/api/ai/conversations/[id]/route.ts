import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import { recordAudit } from "@/lib/security/audit";
import type { AgentConversation, AgentMessage } from "@/types/database";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const { id } = await context.params;
  const user = account.user!;

  const { data: conversation, error } = await account.supabase
    .from("agent_conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(503, "The conversation is not available yet.", {
      code: friendlyDatabaseError(error) ?? "conversation_unavailable",
    });
  }
  if (!conversation) {
    return jsonError(404, "That conversation was not found on your account.", {
      code: "conversation_not_found",
    });
  }

  const { data: messages, error: messagesError } = await account.supabase
    .from("agent_messages")
    .select("*")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(300);

  if (messagesError) {
    return jsonError(503, "The messages could not be loaded.", {
      code: friendlyDatabaseError(messagesError) ?? "messages_unavailable",
    });
  }

  return jsonOk({
    conversation: conversation as AgentConversation,
    messages: (messages ?? []) as AgentMessage[],
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "conversation-delete", 20);
  if (!limited.ok) return limited.response;

  const { id } = await context.params;

  const { data: existing } = await account.supabase
    .from("agent_conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return jsonError(404, "That conversation was not found on your account.", {
      code: "conversation_not_found",
    });
  }

  const { error } = await account.supabase
    .from("agent_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return jsonError(503, "The conversation could not be deleted.", {
      code: friendlyDatabaseError(error) ?? "conversation_delete_failed",
    });
  }

  await recordAudit(account.supabase, user.id, {
    action: "agent_conversation_deleted",
    resourceType: "agent_conversation",
    resourceId: id,
    context: limited.context,
  });

  return jsonOk({ deleted: true, id });
}
