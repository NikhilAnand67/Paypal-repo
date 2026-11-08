import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { declineActionSchema } from "@/lib/validations/schemas";
import { recordAudit } from "@/lib/security/audit";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type { ActionMetadata, AgentAction } from "@/types/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "ai-decline", 20);
  if (!limited.ok) return limited.response;

  const parsed = await parseBody(request, declineActionSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = account.supabase;

  const { data, error } = await supabase
    .from("agent_actions")
    .select("*")
    .eq("id", parsed.data.actionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(503, "The action could not be loaded.", {
      code: friendlyDatabaseError(error) ?? "action_unavailable",
    });
  }
  if (!data) {
    return jsonError(404, "That action was not found on your account.", {
      code: "action_not_found",
    });
  }

  const action = data as AgentAction;
  if (action.execution_status !== "pending_confirmation") {
    return jsonOk({ status: action.execution_status, actionId: action.id });
  }

  await supabase
    .from("agent_actions")
    .update({ execution_status: "declined", confirmation_timestamp: new Date().toISOString() })
    .eq("id", action.id)
    .eq("user_id", user.id);

  const { data: message } = await supabase
    .from("agent_messages")
    .select("id,action_metadata")
    .eq("user_id", user.id)
    .contains("action_metadata", { action_id: action.id })
    .maybeSingle();

  if (message) {
    const existing = (message.action_metadata ?? {}) as ActionMetadata;
    const metadata: ActionMetadata = {
      ...existing,
      action_id: action.id,
      status: "declined",
      proposal: action.action_payload,
      result: null,
      error: null,
    };
    await supabase
      .from("agent_messages")
      .update({ action_metadata: metadata })
      .eq("id", message.id)
      .eq("user_id", user.id);
  }

  await recordAudit(supabase, user.id, {
    action: "agent_action_declined",
    resourceType: "agent_action",
    resourceId: action.id,
    metadata: { actionType: action.action_type },
    context: limited.context,
  });

  return jsonOk({ status: "declined", actionId: action.id });
}
