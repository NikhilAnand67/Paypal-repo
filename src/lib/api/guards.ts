import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { getAccount } from "@/lib/auth/account";
import { jsonError } from "@/lib/security/http";
import { getRequestContext } from "@/lib/security/request-context";
import { rateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/api/origin";

export type ApiAccount = Awaited<ReturnType<typeof getAccount>>;

/** Resolves the verified server session. The client never supplies a user id. */
export async function requireApiUser(): Promise<{
  account: ApiAccount;
  response: NextResponse | null;
}> {
  const account = await getAccount();
  if (!account.user) {
    return {
      account,
      response: jsonError(401, "Sign in to continue.", { code: "unauthenticated" }),
    };
  }
  return { account, response: null };
}

export function enforceRateLimit(
  request: NextRequest,
  userId: string | null,
  scope: string,
  limit: number,
  windowMs = 60_000
) {
  const context = getRequestContext(request);
  const key = rateLimitKey([scope, userId ?? context.ip ?? "anonymous"]);
  const result = rateLimit(key, { limit, windowMs });
  if (!result.success) {
    return {
      ok: false as const,
      context,
      response: jsonError(429, "Too many requests. Try again shortly.", {
        code: "rate_limited",
        details: { retryAfterSeconds: result.retryAfterSeconds },
      }),
    };
  }
  return { ok: true as const, context, response: null };
}

export function rejectCrossOrigin(request: NextRequest): NextResponse | null {
  if (!isSameOrigin(request)) {
    return jsonError(403, "This request came from an untrusted origin.", {
      code: "origin_rejected",
    });
  }
  return null;
}
