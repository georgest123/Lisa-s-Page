import type { Booking } from "@/lib/supabase/types";
import { toE164Phone } from "@/lib/phone";

export type BookingSmsKind = "created" | "updated";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function buildSmsBody(
  booking: Pick<
    Booking,
    "client_name" | "requested_date" | "requested_time" | "status"
  >,
  kind: BookingSmsKind,
  treatmentLabel: string,
): string {
  const when = `${booking.requested_date} at ${formatTime(booking.requested_time)}`;
  const firstName = booking.client_name.trim().split(/\s+/)[0] || "there";

  if (kind === "updated") {
    return `Hi ${firstName}, your L'Beau Clinique booking was updated to ${when} (${treatmentLabel}). Reply to this number if you need us.`;
  }

  if (booking.status === "confirmed") {
    return `Hi ${firstName}, your L'Beau Clinique booking is confirmed for ${when} (${treatmentLabel}). We look forward to seeing you.`;
  }

  return `Hi ${firstName}, we received your L'Beau Clinique booking request for ${when} (${treatmentLabel}). We'll confirm shortly.`;
}

/**
 * Sends a confirmation SMS via Twilio when TWILIO_* env vars are set and
 * the booking has a usable phone number. Skips quietly otherwise.
 */
export async function sendBookingSms(
  booking: Pick<
    Booking,
    | "client_name"
    | "client_phone"
    | "requested_date"
    | "requested_time"
    | "status"
  >,
  kind: BookingSmsKind,
  treatmentLabel: string,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from =
    process.env.TWILIO_FROM_NUMBER?.trim() ||
    process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !from) {
    return { ok: true, skipped: "Twilio not configured" };
  }

  const to = toE164Phone(booking.client_phone);
  if (!to) {
    return { ok: true, skipped: "No valid phone number" };
  }

  const body = buildSmsBody(booking, kind, treatmentLabel);
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64",
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        error: `Twilio ${response.status}: ${text.slice(0, 240)}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}
