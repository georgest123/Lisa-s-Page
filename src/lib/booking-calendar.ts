import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { Booking } from "@/lib/supabase/types";

export const CLINIC_CALENDAR_LOCATION =
  "2 Turpyn Court, Woughton on the Green, Milton Keynes MK6 3BW";

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function formatUtcIcs(dt: DateTime): string {
  return dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
}

export function parseBookingStartLondon(
  requestedDate: string,
  requestedTime: string,
): DateTime | null {
  const timePart =
    requestedTime.length >= 5 ? requestedTime.slice(0, 5) : requestedTime;
  const dt = DateTime.fromISO(`${requestedDate}T${timePart}`, {
    zone: "Europe/London",
  });
  return dt.isValid ? dt : null;
}

export function resolveDurationMinutes(
  serviceDuration: number | null | undefined,
  treatmentDuration: number | null | undefined,
): number {
  if (treatmentDuration != null && treatmentDuration > 0) return treatmentDuration;
  if (serviceDuration != null && serviceDuration > 0) return serviceDuration;
  return 60;
}

export function buildBookingIcs(options: {
  bookingId: string;
  startLondon: DateTime;
  endLondon: DateTime;
  summary: string;
  description: string;
  location?: string;
}): string {
  const location = options.location ?? CLINIC_CALENDAR_LOCATION;
  const dtstamp = formatUtcIcs(DateTime.utc());
  const dtstart = formatUtcIcs(options.startLondon);
  const dtend = formatUtcIcs(options.endLondon);
  const uid = `${options.bookingId}@lbeau-clinique.booking`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//L'Beau Clinique//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(options.summary)}`,
    `DESCRIPTION:${escapeIcsText(options.description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function buildGoogleCalendarUrl(options: {
  startLondon: DateTime;
  endLondon: DateTime;
  text: string;
  details: string;
  location: string;
}): string {
  const start = formatUtcIcs(options.startLondon);
  const end = formatUtcIcs(options.endLondon);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: options.text,
    dates: `${start}/${end}`,
    details: options.details,
    location: options.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatTimeHm(time: string): string {
  return time.slice(0, 5);
}

export function buildCalendarArtifactsFromBooking(
  booking: Booking,
  serviceName: string,
  treatmentName: string | null,
  serviceDurationMinutes: number | null,
  treatmentDurationMinutes: number | null,
): {
  ics: string;
  googleCalendarUrl: string;
  summary: string;
  description: string;
  startLondon: DateTime;
  endLondon: DateTime;
} | null {
  const start = parseBookingStartLondon(
    booking.requested_date,
    booking.requested_time,
  );
  if (!start) return null;

  const duration = resolveDurationMinutes(
    serviceDurationMinutes,
    treatmentDurationMinutes,
  );
  const end = start.plus({ minutes: duration });

  const summary =
    treatmentName != null
      ? `L'Beau Clinique — ${serviceName} (${treatmentName})`
      : `L'Beau Clinique — ${serviceName}`;

  const description = [
    `${booking.requested_date} at ${formatTimeHm(booking.requested_time)} (UK time)`,
    treatmentName != null ? `${serviceName} — ${treatmentName}` : serviceName,
    `Status: ${booking.status}`,
    booking.notes ? `Notes: ${booking.notes}` : null,
    `Reference: ${booking.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ics = buildBookingIcs({
    bookingId: booking.id,
    startLondon: start,
    endLondon: end,
    summary,
    description,
  });

  const googleCalendarUrl = buildGoogleCalendarUrl({
    startLondon: start,
    endLondon: end,
    text: summary,
    details: description,
    location: CLINIC_CALENDAR_LOCATION,
  });

  return {
    ics,
    googleCalendarUrl,
    summary,
    description,
    startLondon: start,
    endLondon: end,
  };
}

export async function loadBookingDetailsForCalendar(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{
  booking: Booking;
  serviceName: string;
  treatmentName: string | null;
  serviceDurationMinutes: number | null;
  treatmentDurationMinutes: number | null;
} | null> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) return null;

  let serviceName = "Treatment";
  let serviceDurationMinutes: number | null = null;
  if (booking.service_id) {
    const { data: svc } = await supabase
      .from("services")
      .select("name, duration_minutes")
      .eq("id", booking.service_id)
      .maybeSingle();
    if (svc?.name) serviceName = svc.name;
    serviceDurationMinutes = svc?.duration_minutes ?? null;
  }

  let treatmentName: string | null = null;
  let treatmentDurationMinutes: number | null = null;
  if (booking.treatment_id) {
    const { data: tr } = await supabase
      .from("treatments")
      .select("name, duration_minutes")
      .eq("id", booking.treatment_id)
      .maybeSingle();
    if (tr?.name) treatmentName = tr.name;
    treatmentDurationMinutes = tr?.duration_minutes ?? null;
  }

  return {
    booking: booking as Booking,
    serviceName,
    treatmentName,
    serviceDurationMinutes,
    treatmentDurationMinutes,
  };
}
