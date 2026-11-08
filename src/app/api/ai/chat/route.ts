import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { agentChatSchema } from "@/lib/validations/schemas";
import { getAgentSnapshot } from "@/lib/data/workspace";
import { reasonAboutMessage } from "@/lib/ai/agent";
import { displayName } from "@/lib/auth/account";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type {
  ActionMetadata,
  AgentActionPayload,
  AgentChatResult,
  AgentConversation,
} from "@/types/database";

export const runtime = "nodejs";

function titleFromMessage(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();
  return (cleaned.length > 68 ? `${cleaned.slice(0, 65)}...` : cleaned) || "New conversation";
}

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "ai-chat", 24);
  if (!limited.ok) return limited.response;

  const parsed = await parseBody(request, agentChatSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = account.supabase;
  const { conversationId: requestedId, message } = parsed.data;

  let conversation: AgentConversation | null = null;

  if (requestedId) {
    const { data, error } = await supabase
      .from("agent_conversations")
      .select("*")
      .eq("id", requestedId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      const code = friendlyDatabaseError(error);
      return jsonError(503, "Your conversations are not available yet.", {
        code: code ?? "conversation_unavailable",
      });
    }
    if (!data) {
      return jsonError(404, "That conversation was not found on your account.", {
        code: "conversation_not_found",
      });
    }
    conversation = data as AgentConversation;
  } else {
    const { data, error } = await supabase
      .from("agent_conversations")
      .insert({
        user_id: user.id,
        title: titleFromMessage(message),
      })
      .select("*")
      .single();

    if (error) {
      const code = friendlyDatabaseError(error);
      return jsonError(503, "Conversations need the database migration before they can be saved.", {
        code: code ?? "conversation_unavailable",
      });
    }
    conversation = data as AgentConversation;
  }

  const { data: historyRows } = await supabase
    .from("agent_messages")
    .select("role,content")
    .eq("conversation_id", conversation.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const history = (historyRows ?? [])
    .slice()
    .reverse()
    .filter(
      (row): row is { role: "user" | "assistant"; content: string } =>
        row.role === "user" || row.role === "assistant"
    )
    .map((row) => ({ role: row.role, content: row.content }));

  const snapshotResult = await getAgentSnapshot(
    supabase,
    user.id,
    account.profile?.currency ?? "USD"
  );

  if (!snapshotResult.snapshot) {
    return jsonError(503, "Your ledger is not available yet.", {
      code: snapshotResult.error ?? "ledger_unavailable",
    });
  }

  const outcome = await reasonAboutMessage({
    message,
    snapshot: snapshotResult.snapshot,
    history,
    userName: displayName(user, account.profile),
  });

  const { error: userMessageError } = await supabase.from("agent_messages").insert({
    conversation_id: conversation.id,
    user_id: user.id,
    role: "user",
    content: message,
    action_metadata: {},
  });

  if (userMessageError) {
    return jsonError(503, "The message could not be saved.", {
      code: friendlyDatabaseError(userMessageError) ?? "message_not_saved",
    });
  }

  const payload: AgentActionPayload | null = outcome.action;
  let actionId: string | null = null;
  let actionError: string | null = null;

  if (payload) {
    const { data: action, error } = await supabase
      .from("agent_actions")
      .insert({
        user_id: user.id,
        conversation_id: conversation.id,
        action_type: payload.type,
        action_payload: payload,
        execution_status: "pending_confirmation",
      })
      .select("id")
      .maybeSingle();

    if (error || !action) {
      actionError = "The action preview could not be saved.";
    } else {
      actionId = action.id as string;
    }
  }

  const metadata: ActionMetadata = {
    engine: outcome.engine,
    status: actionId ? "pending_confirmation" : "none",
    ...(actionId ? { action_id: actionId } : {}),
    proposal: payload,
    ...(actionError ? { error: actionError } : {}),
  };

  const { data: assistantMessage, error: assistantError } = await supabase
    .from("agent_messages")
    .insert({
      conversation_id: conversation.id,
      user_id: user.id,
      role: "assistant",
      content: outcome.reply,
      action_metadata: metadata,
    })
    .select("created_at")
    .single();

  if (assistantError) {
    return jsonError(503, "The reply was generated but could not be saved.", {
      code: friendlyDatabaseError(assistantError) ?? "message_not_saved",
    });
  }

  if (conversation.title === "New conversation") {
    await supabase
      .from("agent_conversations")
      .update({ title: titleFromMessage(message) })
      .eq("id", conversation.id)
      .eq("user_id", user.id);
  }

  const title =
    conversation.title === "New conversation"
      ? titleFromMessage(message)
      : conversation.title;

  const result: AgentChatResult = {
    conversationId: conversation.id,
    conversationTitle: title,
    reply: outcome.reply,
    intent: outcome.intent,
    action: actionId && payload
      ? {
          actionId,
          payload,
          status: "pending_confirmation",
          message: outcome.reply,
          suggestions: outcome.suggestions,
          engine: outcome.engine,
        }
      : null,
    suggestions: outcome.suggestions,
    engine: outcome.engine,
    savedAt: assistantMessage.created_at,
  };

  return jsonOk(result);
}
