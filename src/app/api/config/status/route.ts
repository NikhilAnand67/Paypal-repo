import { NextResponse } from "next/server";
import { publicIntegrationStatus } from "@/lib/config/status";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicIntegrationStatus(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
