import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/security/http";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/api/origin";
import { getRequestContext } from "@/lib/security/request-context";
import { recordAudit } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "This request did not come from the app.", { code: "origin_mismatch" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await recordAudit(supabase, user.id, {
      action: "logout",
      resourceType: "session",
      context: getRequestContext(request),
    });
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    return jsonError(502, "Your session could not be closed. Please try again.", {
      code: "signout_failed",
    });
  }

  const response = jsonOk({ ok: true });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
