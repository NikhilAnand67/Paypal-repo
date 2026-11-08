import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type EmailResult = {
  sent: boolean;
  skipped?: "not_configured";
  error?: string;
  id?: string;
};

/**
 * Sends transactional email through Resend. Delivery failures never break the
 * caller, because login and payment flows must keep working without email.
 */
export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "PayPilot AI <onboarding@resend.dev>";

  if (!apiKey) return { sent: false, skipped: "not_configured" };
  if (!input.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) {
    return { sent: false, error: "invalid_recipient" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { sent: false, error: `resend_${response.status}${detail ? `:${detail.slice(0, 160)}` : ""}` };
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: payload.id };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.name : "email_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}
