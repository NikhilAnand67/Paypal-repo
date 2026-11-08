import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/api/origin";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { profileUpdateSchema } from "@/lib/validations/schemas";
import { recordAudit } from "@/lib/security/audit";
import { getRequestContext } from "@/lib/security/request-context";
import { rateLimit, rateLimitKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "Sign in to view your profile.", { code: "unauthorized" });

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return jsonError(500, "Profile is not available yet. Apply the database migration.", { code: "profile_unavailable" });
  if (!data) return jsonError(404, "Profile not found.", { code: "not_found" });

  return jsonOk({ profile: data });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError(403, "Origin check failed.", { code: "origin_mismatch" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "Sign in to update your profile.", { code: "unauthorized" });

  const limited = rateLimit(rateLimitKey(["profile", user.id]), { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return jsonError(429, "Too many updates. Try again shortly.", { code: "rate_limited" });
  }

  const parsed = await parseBody(request, profileUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const updates = { ...parsed.data };
  if (updates.avatar_url === "") updates.avatar_url = undefined;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(400, "Those profile changes could not be saved.", { code: "update_failed" });

  await recordAudit(supabase, user.id, {
    action: "profile_updated",
    resourceType: "profile",
    resourceId: user.id,
    metadata: { fields: Object.keys(parsed.data) },
    context: getRequestContext(request),
  });

  return jsonOk({ profile: data });
}
