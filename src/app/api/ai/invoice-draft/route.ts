import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonOk, parseBody } from "@/lib/security/http";
import { invoiceDraftSchema } from "@/lib/validations/schemas";
import { generateScopeLine } from "@/lib/ai/gemini";
import { recordAudit } from "@/lib/security/audit";

export const runtime = "nodejs";

function fallbackScope(hint: string) {
  const cleaned = hint.replace(/\s+/g, " ").trim();
  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "invoice-draft", 12);
  if (!limited.ok) return limited.response;

  const parsed = await parseBody(request, invoiceDraftSchema);
  if (!parsed.ok) return parsed.response;

  const generated = await generateScopeLine({
    customer: parsed.data.customer,
    hint: parsed.data.hint,
    kind: parsed.data.kind,
  });

  const scope = generated ?? fallbackScope(parsed.data.hint);

  await recordAudit(account.supabase, user.id, {
    action: "invoice_scope_drafted",
    resourceType: "invoice_draft",
    metadata: { source: generated ? "gemini" : "local", kind: parsed.data.kind },
    context: limited.context,
  });

  return jsonOk({ scope, source: generated ? "gemini" : "local" });
}
