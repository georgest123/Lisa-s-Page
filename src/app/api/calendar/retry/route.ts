import { NextResponse } from "next/server";
import { syncBookingWithGoogleCalendar } from "@/lib/google-calendar-sync";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * POST /api/calendar/retry  body: { bookingId: string }
 * Re-runs Google Calendar sync. Uses a route handler (not a Server Action) so
 * deploys do not break when the client bundle still has an old action hash.
 */
export async function POST(request: Request) {
  let body: { bookingId?: string };
  try {
    body = (await request.json()) as { bookingId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookingId = body.bookingId;
  if (!bookingId || typeof bookingId !== "string") {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  try {
    await syncBookingWithGoogleCalendar(bookingId);

    const supabase = createServiceRoleClient();
    if (supabase) {
      const { data: row } = await supabase
        .from("bookings")
        .select("google_calendar_event_id, google_calendar_sync_error")
        .eq("id", bookingId)
        .maybeSingle();

      if (row?.google_calendar_sync_error && !row.google_calendar_event_id) {
        return NextResponse.json(
          { error: row.google_calendar_sync_error },
          { status: 422 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
