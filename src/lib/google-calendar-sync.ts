import { JWT } from "google-auth-library";
import { google } from "googleapis";
import {
  buildCalendarArtifactsFromBooking,
  CLINIC_CALENDAR_LOCATION,
  loadBookingDetailsForCalendar,
} from "@/lib/booking-calendar";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function createJwtCalendarClient() {
  const email = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL?.trim();
  const key = process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return null;

  const jwt = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth: jwt });
}

export function isGoogleCalendarSyncConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_EMAIL?.trim() &&
      process.env.GOOGLE_CALENDAR_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_CALENDAR_ID?.trim(),
  );
}

/**
 * Creates or updates an event on the clinic Google Calendar (service account).
 * Requires sharing that calendar with the service account email (see env docs).
 */
export async function syncBookingWithGoogleCalendar(bookingId: string): Promise<void> {
  if (!isGoogleCalendarSyncConfigured()) return;

  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;

    const calendarApi = createJwtCalendarClient();
    if (!calendarApi) return;

    const calendarId = process.env.GOOGLE_CALENDAR_CALENDAR_ID!.trim();

    const details = await loadBookingDetailsForCalendar(supabase, bookingId);
    if (!details) return;

    const { booking } = details;
    const googleEventId = booking.google_calendar_event_id ?? null;

    const artifacts = buildCalendarArtifactsFromBooking(
      booking,
      details.serviceName,
      details.treatmentName,
      details.serviceDurationMinutes,
      details.treatmentDurationMinutes,
    );

    if (!artifacts) {
      console.warn("syncBookingWithGoogleCalendar: invalid date/time", bookingId);
      return;
    }

    const summaryTitle =
      details.treatmentName != null
        ? `${booking.client_name} · ${details.serviceName} (${details.treatmentName})`
        : `${booking.client_name} · ${details.serviceName}`;

    const clinicDescription = [
      `Client: ${booking.client_name}`,
      `Email: ${booking.client_email}`,
      booking.client_phone ? `Phone: ${booking.client_phone}` : null,
      booking.notes ? `Notes: ${booking.notes}` : null,
      `Booking ref: ${booking.id}`,
      `Status: ${booking.status}`,
      "",
      artifacts.description,
    ]
      .filter(Boolean)
      .join("\n");

    const startIso = artifacts.startLondon.toISO();
    const endIso = artifacts.endLondon.toISO();
    if (!startIso || !endIso) return;

    const eventBody = {
      summary: summaryTitle,
      description: clinicDescription,
      location: CLINIC_CALENDAR_LOCATION,
      start: {
        dateTime: startIso,
        timeZone: "Europe/London",
      },
      end: {
        dateTime: endIso,
        timeZone: "Europe/London",
      },
    };

    if (booking.status === "cancelled") {
      if (googleEventId) {
        try {
          await calendarApi.events.delete({
            calendarId,
            eventId: googleEventId,
          });
        } catch (err: unknown) {
          const code = (err as { code?: number }).code;
          if (code !== 404) throw err;
        }
        await supabase
          .from("bookings")
          .update({ google_calendar_event_id: null })
          .eq("id", bookingId);
      }
      return;
    }

    if (googleEventId) {
      await calendarApi.events.update({
        calendarId,
        eventId: googleEventId,
        requestBody: eventBody,
      });
      return;
    }

    const inserted = await calendarApi.events.insert({
      calendarId,
      requestBody: eventBody,
    });

    const newId = inserted.data.id;
    if (newId) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ google_calendar_event_id: newId })
        .eq("id", bookingId);
      if (updateError) {
        console.error(
          "syncBookingWithGoogleCalendar: could not store google_calendar_event_id — run supabase/add_google_calendar_event_id.sql if column missing",
          bookingId,
          updateError.message,
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const details = (error as { response?: { data?: unknown } }).response?.data;
    console.error("syncBookingWithGoogleCalendar", bookingId, message, details ?? "");
  }
}
