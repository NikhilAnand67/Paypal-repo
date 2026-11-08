import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  if (value.startsWith("/login") || value.startsWith("/auth")) return "/dashboard";
  return value;
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/ai-agent",
  "/transactions",
  "/invoices",
  "/payment-requests",
  "/analytics",
  "/notifications",
  "/settings",
];

const PUBLIC_PATHS = ["/", "/login", "/privacy", "/terms", "/demo"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

// Redirects must retain refreshed session cookies.
function redirectWithSession(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  search = ""
) {
  const redirect = request.nextUrl.clone();
  redirect.pathname = pathname;
  redirect.search = search;
  const next = NextResponse.redirect(redirect);
  next.headers.set("Cache-Control", "private, no-store, max-age=0");
  for (const cookie of response.cookies.getAll()) {
    next.cookies.set(cookie);
  }
  return next;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (isProtected(request.nextUrl.pathname)) {
      return redirectWithSession(
        request,
        response,
        "/login",
        "?error=supabase_not_configured"
      );
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        for (const [name, value] of Object.entries(headers ?? {})) {
          response.headers.set(name, value);
        }
      },
    },
  });

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const { pathname, searchParams } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    return redirectWithSession(
      request,
      response,
      "/login",
      `?next=${encodeURIComponent(pathname)}`
    );
  }

  if (user && pathname === "/login") {
    return redirectWithSession(
      request,
      response,
      safeNext(searchParams.get("next")),
      ""
    );
  }

  if (pathname === "/login" || isPublic(pathname)) {
    return response;
  }

  return response;
}
