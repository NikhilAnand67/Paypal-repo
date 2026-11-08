import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk } from "@/lib/security/http";
import { sendEmail } from "@/lib/email/resend";
import { loginNotificationEmail } from "@/lib/email/templates";
import { recordAudit } from "@/lib/security/audit";
import { authProvider, displayName } from "@/lib/auth/account";
import { providerLabel } from "@/lib/utils/format";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "login-email", 5, 10 * 60_000);
  if (!limited.ok) return limited.response;

  if (!user.email) {
    return jsonError(400, "This account has no verified email on file.", {
      code: "verified_email_missing",
    });
  }

  if (account.profile?.security_alerts === false) {
    return jsonOk({ sent: false, skipped: "disabled_by_preference" });
  }

  const template = loginNotificationEmail({
    name: displayName(user, account.profile),
    provider: providerLabel(authProvider(user, account.profile)),
    timestamp: new Date().toISOString(),
    ip: limited.context.ip,
    userAgent: limited.context.userAgent,
  });

  const result = await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  await recordAudit(account.supabase, user.id, {
    action: result.sent ? "login_email_sent" : "login_email_skipped",
    resourceType: "session",
    metadata: {
      provider: authProvider(user, account.profile),
      delivered: result.sent,
      reason: result.skipped ?? result.error ?? null,
    },
    context: limited.context,
  });

  if (!result.sent && result.skipped === "not_configured") {
    return jsonOk({ sent: false, skipped: "not_configured" });
  }

  if (!result.sent) {
    return jsonError(502, "The security email could not be delivered. Your session is still active.", {
      code: "email_failed",
    });
  }

  return jsonOk({ sent: true, id: result.id ?? null });
}
