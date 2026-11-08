import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function jsonError(
  status: number,
  message: string,
  extras: { code?: string; details?: unknown } = {}
) {
  return NextResponse.json(
    { error: message, ...(extras.code ? { code: extras.code } : {}), ...(extras.details ? { details: extras.details } : {}) },
    { status }
  );
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, "Request body must be valid JSON.", { code: "invalid_json" }) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(400, "Please check the highlighted fields.", {
        code: "validation_failed",
        details: flattenZodError(parsed.error),
      }),
    };
  }
  return { ok: true, data: parsed.data };
}

export function flattenZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function isDatabaseSetupError(error: { code?: string } | null | undefined) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

export function noStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0" } as Record<string, string>;
}
