import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { getWorkspace } from "@/lib/data/workspace";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "ai-analysis", 30);
  if (!limited.ok) return limited.response;

  const workspace = await getWorkspace(
    account.supabase,
    user.id,
    account.profile?.currency ?? "USD"
  );

  if (workspace.error) {
    return jsonError(503, "Your ledger is not available yet.", {
      code: workspace.error,
    });
  }

  return jsonOk({
    summary: workspace.summary,
    insights: workspace.insights,
    generatedAt: new Date().toISOString(),
    demoDataPresent: workspace.summary.hasDemoData,
  });
}
