import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  isSameOrigin: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/api/origin", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/security/audit", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("@/lib/security/request-context", () => ({
  getRequestContext: () => ({ ip: null, userAgent: null }),
}));

import { POST } from "@/app/auth/signout/route";
import { displayName, sanitizeNextPath } from "@/lib/auth/account";
import { getAuthProviders } from "@/lib/supabase/providers";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser, signOut: mocks.signOut },
  });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.isSameOrigin.mockReturnValue(true);
});

function signOutRequest() {
  return new NextRequest("http://localhost:3000/auth/signout", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
  });
}

describe("sign-out", () => {
  it("closes only the current session and prevents response caching", async () => {
    const response = await POST(signOutRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("rejects cross-origin requests without changing the session", async () => {
    mocks.isSameOrigin.mockReturnValue(false);
    const response = await POST(signOutRequest());
    expect(response.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("returns an error instead of claiming successful sign-out", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "Upstream unavailable" } });
    const response = await POST(signOutRequest());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Your session could not be closed. Please try again.",
      code: "signout_failed",
    });
  });

  it("remains idempotent when there is no authenticated user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(signOutRequest());
    expect(response.status).toBe(200);
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });
});

describe("display names", () => {
  it("trims the stored profile name", () => {
    expect(displayName(null, { full_name: "  Nikhil Anand  " } as Profile)).toBe("Nikhil Anand");
  });

  it("skips blank and non-text provider metadata", () => {
    const user: User = {
      id: "test-user",
      app_metadata: {},
      aud: "authenticated",
      created_at: "2026-11-08T00:00:00Z",
      email: "pilot@example.test",
      user_metadata: { full_name: "   ", name: { invalid: true }, user_name: "  Pilot  " },
    };
    expect(displayName(user)).toBe("Pilot");
  });

  it("uses a nonempty fallback for accounts without an email or name", () => {
    expect(displayName({ email: "", user_metadata: {} } as User)).toBe("Pilot");
  });
});

describe("provider availability", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  });

  it("reads provider enablement with a bounded network request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ external: { google: true, github: false, email: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await getAuthProviders()).toEqual({ google: true, github: false, email: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/settings",
      expect.objectContaining({ signal: expect.any(AbortSignal), next: { revalidate: 60 } })
    );
  });

  it("does not prevent sign-in when provider discovery fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
    expect(await getAuthProviders()).toEqual({ google: null, github: null, email: null });
  });

  it("skips provider discovery when Supabase is unconfigured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await getAuthProviders()).toEqual({ google: null, github: null, email: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("post-login destinations", () => {
  it("retains local workspace destinations", () => {
    expect(sanitizeNextPath("/invoices?new=1")).toBe("/invoices?new=1");
  });

  it("rejects external destinations and authentication redirect loops", () => {
    for (const destination of ["https://example.test", "//example.test", "/\\example.test", "/login", "/auth/callback"]) {
      expect(sanitizeNextPath(destination)).toBe("/dashboard");
    }
  });
});
