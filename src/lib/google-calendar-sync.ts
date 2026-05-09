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

export type GoogleCalendarDiagnostics = {
  ok: boolean;
  summary: string;
  env: {
    clientEmailSet: boolean;
    privateKeySet: boolean;
    calendarId: string | null;
  };
  steps: {
    jwtClient: "ok" | "fail";
    apiCanReadCalendar: "ok" | "fail" | "skipped";
    supabaseBookingsColumn: "ok" | "missing" | "unknown" | "skipped";
  };
  details?: unknown;
};

/** Used by /api/health/google-calendar — does not modify calendars or bookings. */
export async function runGoogleCalendarDiagnostics(): Promise<GoogleCalendarDiagnostics> {
  const env = {
    clientEmailSet: Boolean(process.env.GOOGLE_CALENDAR_CLIENT_EMAIL?.trim()),
    privateKeySet: Boolean(process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.trim()),
    calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID?.trim() ?? null,
  };

  if (!env.clientEmailSet || !env.privateKeySet || !env.calendarId) {
    return {
      ok: false,
      summary:
        "Missing GOOGLE_CALENDAR_CLIENT_EMAIL, GOOGLE_CALENDAR_PRIVATE_KEY, or GOOGLE_CALENDAR_CALENDAR_ID on this deployment.",
      env,
      steps: {
        jwtClient: "fail",
        apiCanReadCalendar: "skipped",
        supabaseBookingsColumn: "skipped",
      },
    };
  }

  const calendarApi = createJwtCalendarClient();
  if (!calendarApi) {
    return {
      ok: false,
      summary:
        "Private key or client email invalid — check GOOGLE_CALENDAR_PRIVATE_KEY (use \\n newlines in Vercel).",
      env,
      steps: {
        jwtClient: "fail",
        apiCanReadCalendar: "skipped",
        supabaseBookingsColumn: "skipped",
      },
    };
  }

  let supabaseBookingsColumn: GoogleCalendarDiagnostics["steps"]["supabaseBookingsColumn"] =
    "skipped";
  const supabase = createServiceRoleClient();
  if (supabase) {
    const { error } = await supabase
      .from("bookings")
      .select("id, google_calendar_event_id")
      .limit(1);
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("google_calendar_event_id") ||
        msg.includes("schema cache") ||
        msg.includes("does not exist")
      ) {
        supabaseBookingsColumn = "missing";
      } else {
        supabaseBookingsColumn = "unknown";
      }
    } else {
      supabaseBookingsColumn = "ok";
    }
  }

  try {
    const res = await calendarApi.calendars.get({
      calendarId: env.calendarId,
    });

    const calendarOk = Boolean(res.data);

    const dbHint =
      supabaseBookingsColumn === "missing"
        ? " Run supabase/add_google_calendar_event_id.sql in Supabase."
        : "";

    return {
      ok: calendarOk && supabaseBookingsColumn !== "missing",
      summary: calendarOk
        ? `Can access calendar "${res.data.summary ?? env.calendarId}".${dbHint ? ` ⚠ ${dbHint.trim()}` : ""}`
        : "Unexpected empty response from Google.",
      env,
      steps: {
        jwtClient: "ok",
        apiCanReadCalendar: calendarOk ? "ok" : "fail",
        supabaseBookingsColumn,
      },
      details: res.data,
    };
  } catch (error) {
    const err = error as {
      code?: number;
      message?: string;
      response?: { status?: number; data?: unknown };
    };
    const status = err.response?.status ?? err.code;
    const body = err.response?.data;
    const hint =
      status === 404
        ? " Calendar not found — check GOOGLE_CALENDAR_CALENDAR_ID (use your Gmail for the primary calendar)."
        : status === 403
          ? " Forbidden — share your calendar with the service account email (Make changes to events)."
          : "";

    return {
      ok: false,
      summary: `${err.message ?? "Google API error"}${hint}`,
      env,
      steps: {
        jwtClient: "ok",
        apiCanReadCalendar: "fail",
        supabaseBookingsColumn,
      },
      details: body,
    };
  }
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
