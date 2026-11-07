import { DateTime } from "luxon";
import { Resend } from "resend";
import {
  buildCalendarArtifactsFromBooking,
  loadBookingDetailsForCalendar,
  parseBookingStartLondon,
} from "@/lib/booking-calendar";
import { getPublicSiteUrl } from "@/lib/site-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Booking } from "@/lib/supabase/types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

const REMINDABLE_STATUSES = new Set(["confirmed", "pending"]);

/**
 * Emails clients a day-before reminder for upcoming appointments (UK time).
 * Designed for a daily Vercel Cron (Hobby allows once per day).
 */
export async function processBookingReminders(options?: {
  now?: DateTime;
}): Promise<{
  ok: boolean;
  scanned: number;
  sent: number;
  skipped: number;
  targetDate: string | null;
  errors: string[];
}> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      scanned: 0,
      sent: 0,
      skipped: 0,
      targetDate: null,
      errors: ["SUPABASE_SERVICE_ROLE_KEY not configured"],
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: true,
      scanned: 0,
      sent: 0,
      skipped: 0,
      targetDate: null,
      errors: [],
    };
  }

  const now = options?.now ?? DateTime.now().setZone("Europe/London");
  const targetDate = now.plus({ days: 1 }).toISODate();
  if (!targetDate) {
    return {
      ok: false,
      scanned: 0,
      sent: 0,
      skipped: 0,
      targetDate: null,
      errors: ["Could not compute reminder target date"],
    };
  }

  const { data: rows, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("requested_date", targetDate)
    .is("reminder_email_sent_at", null)
    .in("status", ["confirmed", "pending"]);

  if (error) {
    return {
      ok: false,
      scanned: 0,
      sent: 0,
      skipped: 0,
      targetDate,
      errors: [error.message],
    };
  }

  const bookings = (rows ?? []) as Booking[];
  const from =
    process.env.BOOKING_EMAIL_FROM ?? "L'Beau Clinique <onboarding@resend.dev>";
  const siteUrl = getPublicSiteUrl();
  const resend = new Resend(apiKey);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    if (!REMINDABLE_STATUSES.has(booking.status)) {
      skipped += 1;
      continue;
    }
    if (!booking.client_email?.trim()) {
      skipped += 1;
      continue;
    }

    const start = parseBookingStartLondon(
      booking.requested_date,
      booking.requested_time,
    );
    if (!start || start <= now) {
      skipped += 1;
      continue;
    }

    const details = await loadBookingDetailsForCalendar(supabase, booking.id);
    if (!details) {
      errors.push(`${booking.id}: details not found`);
      continue;
    }

    const treatmentLine = details.treatmentName
      ? `${escapeHtml(details.serviceName)} — ${escapeHtml(details.treatmentName)}`
      : escapeHtml(details.serviceName);
    const whenLine = `${booking.requested_date} at ${formatTime(booking.requested_time)}`;
    const icsPageUrl = `${siteUrl}/api/bookings/${booking.id}/calendar`;
    const googleCalendarProxyUrl = `${siteUrl}/api/bookings/${booking.id}/calendar?fmt=google`;

    const calendar = buildCalendarArtifactsFromBooking(
      details.booking,
      details.serviceName,
      details.treatmentName,
      details.serviceDurationMinutes,
      details.treatmentDurationMinutes,
    );

    const html = `
      <div style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.6;color:#2a211b;max-width:520px">
        <p>Hello ${escapeHtml(booking.client_name)},</p>
        <p>This is a friendly reminder that your L'Beau Clinique appointment is tomorrow.</p>
        <table style="margin:16px 0;border-collapse:collapse">
          <tr><td style="padding:4px 12px 4px 0;color:#776b5f">Treatment</td><td>${treatmentLine}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#776b5f">When</td><td>${escapeHtml(whenLine)} (UK time)</td></tr>
        </table>
        <p style="margin-top:18px;margin-bottom:8px;font-size:14px;color:#5c4f42"><strong>Add to your calendar</strong></p>
        <p style="margin:0;font-size:14px;line-height:1.8">
          <a href="${escapeHtml(icsPageUrl)}" style="color:#8b6914">Download .ics</a>
          &nbsp;·&nbsp;
          <a href="${escapeHtml(googleCalendarProxyUrl)}" style="color:#8b6914">Open in Google Calendar</a>
        </p>
        <p style="margin-top:20px;font-size:14px;color:#776b5f">We look forward to seeing you.<br/>L'Beau Clinique · Milton Keynes</p>
      </div>
    `;

    const attachments =
      calendar != null
        ? [
            {
              filename: `lbeau-reminder-${booking.id.slice(0, 8)}.ics`,
              content: Buffer.from(calendar.ics, "utf8"),
              contentType: "text/calendar; charset=utf-8",
            },
          ]
        : undefined;

    const result = await resend.emails.send({
      from,
      to: booking.client_email,
      subject: `Reminder: your L'Beau Clinique appointment tomorrow (${formatTime(booking.requested_time)})`,
      html,
      ...(attachments ? { attachments } : {}),
    });

    if (result.error) {
      errors.push(`${booking.id}: ${result.error.message}`);
      continue;
    }

    const { error: markErr } = await supabase
      .from("bookings")
      .update({ reminder_email_sent_at: new Date().toISOString() })
      .eq("id", booking.id)
      .is("reminder_email_sent_at", null);

    if (markErr) {
      errors.push(`${booking.id}: sent but mark failed (${markErr.message})`);
    }

    sent += 1;
  }

  return {
    ok: errors.length === 0,
    scanned: bookings.length,
    sent,
    skipped,
    targetDate,
    errors,
  };
}
