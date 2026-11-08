import { type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type { AgentConversation } from "@/types/database";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const user = account.user!;
  const limitParam = Number(new URL(request.url).searchParams.get("limit") ?? 40);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 100) : 40;

  const { data, error } = await account.supabase
    .from("agent_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return jsonError(503, "Conversations are not available yet.", {
      code: friendlyDatabaseError(error) ?? "conversation_unavailable",
    });
  }

  return jsonOk({ conversations: (data ?? []) as AgentConversation[] });
}
