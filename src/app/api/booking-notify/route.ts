import { NextResponse } from "next/server";
import { sendBookingNotifications } from "@/lib/booking-emails";
import type { BookingNotifyKind } from "@/lib/booking-emails";
import { syncBookingWithGoogleCalendar } from "@/lib/google-calendar-sync";

/**
 * Optional: Supabase Database Webhook (INSERT/UPDATE on bookings) → POST here with
 * Authorization: Bearer BOOKING_NOTIFY_WEBHOOK_SECRET
 */
export async function POST(request: Request) {
  const secret =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-webhook-secret");

  if (
    !process.env.BOOKING_NOTIFY_WEBHOOK_SECRET ||
    secret !== process.env.BOOKING_NOTIFY_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    type?: string;
    record?: { id?: string };
    bookingId?: string;
  };

  const bookingId = payload.record?.id ?? payload.bookingId;
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
  }

  const kind: BookingNotifyKind =
    payload.type === "UPDATE" ? "updated" : "created";

  await syncBookingWithGoogleCalendar(bookingId);
  const result = await sendBookingNotifications(bookingId, kind);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Send failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, skipped: result.skipped });
}
