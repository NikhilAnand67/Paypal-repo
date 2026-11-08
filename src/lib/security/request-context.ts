import type { NextRequest } from "next/server";

export type RequestContext = {
  ip: string | null;
  userAgent: string | null;
};

/**
 * Reads forwarded headers that Vercel and most trusted proxies set.
 * A client supplied IP header is only used because these headers are trusted
 * in deployment. Local development falls back to null.
 */
export function getRequestContext(request: NextRequest): RequestContext {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  return {
    ip,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  };
}
