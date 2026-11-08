import { after, NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/account";
import { getRequestContext } from "@/lib/security/request-context";
import { recordAudit } from "@/lib/security/audit";
import { sendEmail } from "@/lib/email/resend";
import { loginNotificationEmail } from "@/lib/email/templates";
import { authProvider, displayName } from "@/lib/auth/account";

export const runtime = "nodejs";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const next = sanitizeNextPath(url.searchParams.get("next"), "/dashboard");

  if (providerError) {
    return redirectTo(request, "/login?error=provider_sign_in_failed");
  }

  if (!code) {
    return redirectTo(request, "/login?error=missing_code");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectTo(request, "/login?error=auth_callback_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo(request, "/login?error=session_not_established");
  }

  const context = getRequestContext(request);
  const provider = authProvider(user);

  await recordAudit(supabase, user.id, {
    action: "login",
    resourceType: "session",
    metadata: { provider, method: "oauth" },
    context,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_notifications,security_alerts,full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (user.email && (profile?.security_alerts ?? true)) {
    after(async () => {
      const template = loginNotificationEmail({
        name: profile?.full_name || displayName(user),
        provider,
        timestamp: new Date().toISOString(),
        ip: context.ip,
        userAgent: context.userAgent,
      });
      await sendEmail({
        to: user.email!,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    });
  }

  return redirectTo(request, next);
}
