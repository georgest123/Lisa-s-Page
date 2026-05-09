import { NextResponse } from "next/server";
import {
  buildCalendarArtifactsFromBooking,
  loadBookingDetailsForCalendar,
} from "@/lib/booking-calendar";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: bookingId } = await context.params;
  const fmt = new URL(request.url).searchParams.get("fmt");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const details = await loadBookingDetailsForCalendar(supabase, bookingId);
  if (!details) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const artifacts = buildCalendarArtifactsFromBooking(
    details.booking,
    details.serviceName,
    details.treatmentName,
    details.serviceDurationMinutes,
    details.treatmentDurationMinutes,
  );

  if (!artifacts) {
    return NextResponse.json(
      { error: "Invalid booking date or time" },
      { status: 422 },
    );
  }

  if (fmt === "google") {
    return NextResponse.redirect(artifacts.googleCalendarUrl, 302);
  }

  return new NextResponse(artifacts.ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="lbeau-booking-${bookingId.slice(0, 8)}.ics"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
