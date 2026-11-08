import "server-only";

export type IntegrationStatus = {
  supabase: boolean;
  paypal: boolean;
  paypalWebhook: boolean;
  serviceRole: boolean;
  gemini: boolean;
  resend: boolean;
  sandbox: boolean;
  appUrl: string;
  geminiModel: string;
};

export function appUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function paypalBaseUrl() {
  const configured = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
  const isLive = configured.includes("api-m.paypal.com") && !configured.includes("sandbox");
  if (isLive && process.env.PAYPAL_ALLOW_LIVE !== "true") {
    return "https://api-m.sandbox.paypal.com";
  }
  return configured;
}

export function isSandbox() {
  return paypalBaseUrl().includes("sandbox");
}

export function getIntegrationStatus(): IntegrationStatus {
  return {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ),
    paypal: Boolean(
      process.env.PAYPAL_CLIENT_ID &&
        process.env.PAYPAL_CLIENT_SECRET &&
        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    ),
    paypalWebhook: Boolean(process.env.PAYPAL_WEBHOOK_ID),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    sandbox: isSandbox(),
    appUrl: appUrl(),
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  };
}

export function publicIntegrationStatus() {
  const status = getIntegrationStatus();
  return {
    paypal: status.paypal,
    gemini: status.gemini,
    resend: status.resend,
    sandbox: status.sandbox,
    appUrl: status.appUrl,
  };
}
