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

type ServiceSupabase = NonNullable<ReturnType<typeof createServiceRoleClient>>;

async function ensureBookingCalendarColumns(supabase: ServiceSupabase): Promise<void> {
  const { error } = await supabase.rpc("ensure_booking_calendar_columns");
  if (error) {
    console.warn(
      "ensure_booking_calendar_columns:",
      error.message,
      "Run supabase/ensure_google_calendar_sync.sql in Supabase SQL Editor once.",
    );
  }
}

function formatGoogleSyncError(error: unknown): string {
  const err = error as {
    message?: string;
    response?: { data?: unknown; status?: number };
  };
  const bits = [err.message ?? String(error)];
  if (err.response?.data !== undefined) {
    bits.push(JSON.stringify(err.response.data));
  }
  return bits.filter(Boolean).join(" ").slice(0, 500);
}

function shouldRetryHttp(err: unknown): boolean {
  const e = err as { response?: { status?: number }; code?: number };
  const status = e.response?.status ?? e.code;
  return status === 429 || status === 503 || status === 408 || status === 500;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function callWithRetries<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt < 2 && shouldRetryHttp(e)) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      throw e;
    }
  }
  throw last;
}

async function persistCalendarSyncFailure(
  supabase: ServiceSupabase,
  bookingId: string,
  message: string,
): Promise<void> {
  const truncated = message.slice(0, 500);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({
      google_calendar_sync_error: truncated,
      google_calendar_sync_attempted_at: now,
    })
    .eq("id", bookingId);
  if (error) {
    console.error(
      "persistCalendarSyncFailure",
      bookingId,
      error.message,
      "— run supabase/ensure_google_calendar_sync.sql",
    );
  }
}

async function persistCalendarSyncSuccess(
  supabase: ServiceSupabase,
  bookingId: string,
  patch: {
    google_calendar_event_id?: string | null;
    clearEventId?: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    google_calendar_sync_error: null,
    google_calendar_last_success_at: now,
    google_calendar_sync_attempted_at: now,
  };
  if (patch.clearEventId) {
    payload.google_calendar_event_id = null;
  } else if (patch.google_calendar_event_id !== undefined) {
    payload.google_calendar_event_id = patch.google_calendar_event_id;
  }

  const { error } = await supabase
    .from("bookings")
    .update(payload)
    .eq("id", bookingId);
  if (error) {
    console.error(
      "persistCalendarSyncSuccess",
      bookingId,
      error.message,
      "— run supabase/ensure_google_calendar_sync.sql",
    );
  }
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
      .select(
        "id, google_calendar_event_id, google_calendar_sync_error, google_calendar_sync_attempted_at",
      )
      .limit(1);
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("google_calendar") ||
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
        ? " Run supabase/ensure_google_calendar_sync.sql in Supabase SQL Editor."
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

  const supabase = createServiceRoleClient();
  if (!supabase) return;

  await ensureBookingCalendarColumns(supabase);

  const calendarApi = createJwtCalendarClient();
  if (!calendarApi) {
    console.error(
      "syncBookingWithGoogleCalendar: JWT client missing — check GOOGLE_CALENDAR_PRIVATE_KEY",
      bookingId,
    );
    return;
  }

  const calendarId = process.env.GOOGLE_CALENDAR_CALENDAR_ID!.trim();

  try {
    const details = await loadBookingDetailsForCalendar(supabase, bookingId);
    if (!details) {
      console.warn("syncBookingWithGoogleCalendar: booking not found", bookingId);
      return;
    }

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
      await persistCalendarSyncFailure(
        supabase,
        bookingId,
        "Invalid booking date or time for calendar sync.",
      );
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
    if (!startIso || !endIso) {
      await persistCalendarSyncFailure(
        supabase,
        bookingId,
        "Could not compute event start/end (timezone).",
      );
      return;
    }

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
          await callWithRetries(() =>
            calendarApi.events.delete({
              calendarId,
              eventId: googleEventId,
            }),
          );
        } catch (err: unknown) {
          const code = (err as { code?: number }).code;
          if (code !== 404) throw err;
        }
        await persistCalendarSyncSuccess(supabase, bookingId, { clearEventId: true });
      }
      return;
    }

    if (googleEventId) {
      await callWithRetries(() =>
        calendarApi.events.update({
          calendarId,
          eventId: googleEventId,
          requestBody: eventBody,
        }),
      );
      await persistCalendarSyncSuccess(supabase, bookingId, {});
      return;
    }

    const inserted = await callWithRetries(() =>
      calendarApi.events.insert({
        calendarId,
        requestBody: eventBody,
      }),
    );

    const newId = inserted.data.id;
    if (newId) {
      await persistCalendarSyncSuccess(supabase, bookingId, {
        google_calendar_event_id: newId,
      });
    } else {
      await persistCalendarSyncFailure(
        supabase,
        bookingId,
        "Google Calendar insert returned no event id.",
      );
    }
  } catch (error) {
    const msg = formatGoogleSyncError(error);
    console.error("syncBookingWithGoogleCalendar", bookingId, msg);
    await persistCalendarSyncFailure(supabase, bookingId, msg);
  }
}

/**
 * Removes the Google Calendar event for this booking if one exists.
 * Call before deleting the row from Supabase.
 */
export async function deleteGoogleCalendarEventForBooking(
  bookingId: string,
): Promise<void> {
  if (!isGoogleCalendarSyncConfigured()) return;

  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;

    const calendarApi = createJwtCalendarClient();
    if (!calendarApi) return;

    const calendarId = process.env.GOOGLE_CALENDAR_CALENDAR_ID!.trim();

    const { data: row } = await supabase
      .from("bookings")
      .select("google_calendar_event_id")
      .eq("id", bookingId)
      .maybeSingle();

    const eventId = row?.google_calendar_event_id as string | null | undefined;
    if (!eventId) return;

    try {
      await calendarApi.events.delete({
        calendarId,
        eventId,
      });
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code !== 404) {
        console.error("deleteGoogleCalendarEventForBooking API", bookingId, err);
      }
    }
  } catch (error) {
    console.error("deleteGoogleCalendarEventForBooking", bookingId, error);
  }
}
