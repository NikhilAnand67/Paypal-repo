import "server-only";

import { createHash } from "node:crypto";
import { appUrl, paypalBaseUrl } from "@/lib/config/status";

export type PayPalLink = { href: string; rel: string; method: string };
export type PayPalAmount = { currency_code: string; value: string };

export type PayPalCapture = {
  id: string;
  status: string;
  amount: PayPalAmount;
  final_capture?: boolean;
  create_time?: string;
  update_time?: string;
  seller_protection?: { status?: string };
};

export type PayPalOrder = {
  id: string;
  status: string;
  intent?: string;
  create_time?: string;
  purchase_units: {
    reference_id?: string;
    custom_id?: string;
    description?: string;
    amount: PayPalAmount;
    payments?: { captures?: PayPalCapture[] };
  }[];
  payer?: {
    payer_id?: string;
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  links: PayPalLink[];
};

export class PayPalError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 502, code = "paypal_error", details?: unknown) {
    super(message);
    this.name = "PayPalError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type TokenCache = { token: string; expiresAt: number; baseUrl: string };
let tokenCache: TokenCache | null = null;

export function isPayPalConfigured() {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  );
}

function credentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new PayPalError(
      "PayPal sandbox credentials are missing on the server.",
      503,
      "paypal_not_configured"
    );
  }
  return { clientId, secret };
}

export async function getPayPalAccessToken() {
  const baseUrl = paypalBaseUrl();
  if (tokenCache && tokenCache.baseUrl === baseUrl && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const { clientId, secret } = credentials();
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PayPalError(
      "PayPal authentication failed. Check the sandbox client id and secret.",
      502,
      "paypal_auth_failed"
    );
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new PayPalError("PayPal did not return an access token.", 502, "paypal_auth_failed");
  }

  tokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3000) * 1000,
    baseUrl,
  };
  return tokenCache.token;
}

async function paypalFetch<T>(
  path: string,
  init: RequestInit & { requestId?: string } = {}
): Promise<T> {
  const token = await getPayPalAccessToken();
  const baseUrl = paypalBaseUrl();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  if (init.requestId) headers.set("PayPal-Request-Id", init.requestId.slice(0, 108));

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload as { name?: string; message?: string; details?: unknown } | null;
    throw new PayPalError(
      detail?.message || "PayPal rejected the request.",
      response.status,
      detail?.name || "paypal_error",
      detail?.details
    );
  }

  return payload as T;
}

export function paypalAmount(amount: number, currency: string) {
  const rounded = Math.round(amount * 100) / 100;
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new PayPalError("Order amount is not valid.", 400, "invalid_amount");
  }
  return currency === "JPY" ? String(Math.round(rounded)) : rounded.toFixed(2);
}

export async function createOrder(input: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  description: string;
}) {
  const requestId = `paypilot-${input.invoiceId}-${createHash("sha256")
    .update(`${input.amount}:${input.currency}:${input.invoiceNumber}`)
    .digest("hex")
    .slice(0, 12)}`;

  const returnUrl = `${appUrl()}/payment-requests?paypal=return`;
  const cancelUrl = `${appUrl()}/payment-requests?paypal=cancel`;

  return paypalFetch<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    requestId,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.invoiceId,
          custom_id: input.invoiceId,
          description: `PayPilot ${input.invoiceNumber}`.slice(0, 127),
          amount: {
            currency_code: input.currency,
            value: paypalAmount(input.amount, input.currency),
          },
        },
      ],
      application_context: {
        brand_name: "PayPilot AI",
        landing_page: "LOGIN",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
}

export async function getOrder(orderId: string) {
  return paypalFetch<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
}

export async function captureOrder(orderId: string) {
  return paypalFetch<PayPalOrder>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      requestId: `paypilot-capture-${orderId}`,
      body: JSON.stringify({}),
    }
  );
}

export function approvalLink(order: PayPalOrder) {
  return order.links?.find((link) => link.rel === "approve")?.href ?? null;
}

export function firstCapture(order: PayPalOrder): PayPalCapture | null {
  return order.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
}

export async function verifyWebhookSignature(
  headers: Headers,
  event: unknown
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  try {
    const result = await paypalFetch<{ verification_status?: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: event,
        }),
      }
    );
    return result.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
