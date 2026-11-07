import { NextResponse } from "next/server";
import { processBookingReminders } from "@/lib/booking-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const query = new URL(request.url).searchParams.get("secret")?.trim() ?? "";
  return bearer === secret || query === secret;
}

/** Hourly Vercel Cron: email clients ~24h before their appointment. */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processBookingReminders();
  console.info("booking-reminders", result);

  return NextResponse.json(result, {
    status: result.ok || result.sent > 0 ? 200 : 500,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
