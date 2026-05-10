import { NextResponse } from "next/server";
import { runGoogleCalendarDiagnostics } from "@/lib/google-calendar-sync";

/**
 * GET /api/health/google-calendar?secret=YOUR_SECRET
 * Set GOOGLE_CALENDAR_DIAGNOSTIC_SECRET in Vercel (same value as ?secret=).
 * Returns JSON only — does not create events. Remove secret when done debugging.
 */
export async function GET(request: Request) {
  const expected = process.env.GOOGLE_CALENDAR_DIAGNOSTIC_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  const secret =
    new URL(request.url).searchParams.get("secret") ?? "";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diag = await runGoogleCalendarDiagnostics();
  return NextResponse.json(diag, { status: diag.ok ? 200 : 503 });
}
