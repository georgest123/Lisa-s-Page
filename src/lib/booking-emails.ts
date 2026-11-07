import { Resend } from "resend";
import {
  buildCalendarArtifactsFromBooking,
  loadBookingDetailsForCalendar,
} from "@/lib/booking-calendar";
import { sendBookingSms } from "@/lib/booking-sms";
import { getPublicSiteUrl } from "@/lib/site-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type BookingNotifyKind = "created" | "updated";

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

export async function sendBookingNotifications(
  bookingId: string,
  kind: BookingNotifyKind,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" };
  }

  const details = await loadBookingDetailsForCalendar(supabase, bookingId);
  if (!details) {
    return { ok: false, error: "Booking not found" };
  }

  const { booking, serviceName, treatmentName } = details;

  if (booking.status === "pending_payment") {
    return { ok: true, skipped: "Awaiting deposit payment" };
  }

  const treatmentLabelPlain = treatmentName
    ? `${serviceName} — ${treatmentName}`
    : serviceName;

  const smsPromise = sendBookingSms(booking, kind, treatmentLabelPlain);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const smsResult = await smsPromise;
    if (!smsResult.ok) {
      console.error("sendBookingSms", smsResult.error);
    }
    return { ok: true, skipped: "RESEND_API_KEY not set" };
  }

  const calendar = buildCalendarArtifactsFromBooking(
    details.booking,
    details.serviceName,
    details.treatmentName,
    details.serviceDurationMinutes,
    details.treatmentDurationMinutes,
  );

  const { data: settings } = await supabase
    .from("booking_settings")
    .select("notification_email")
    .eq("id", true)
    .maybeSingle();

  const adminEmail =
    settings?.notification_email ??
    process.env.BOOKING_ADMIN_EMAIL ??
    "lbeauclinique@gmail.com";

  const from =
    process.env.BOOKING_EMAIL_FROM ?? "L'Beau Clinique <onboarding@resend.dev>";

  const siteUrl = getPublicSiteUrl();
  const icsPageUrl = `${siteUrl}/api/bookings/${booking.id}/calendar`;
  const googleCalendarProxyUrl = `${siteUrl}/api/bookings/${booking.id}/calendar?fmt=google`;

  const treatmentLine = treatmentName
    ? `${escapeHtml(serviceName)} — ${escapeHtml(treatmentName)}`
    : escapeHtml(serviceName);

  const whenLine = `${booking.requested_date} at ${formatTime(booking.requested_time)}`;

  const statusNote =
    kind === "created"
      ? booking.status === "confirmed"
        ? "Confirmed"
        : "Pending confirmation"
      : `Status: ${booking.status}`;

  const clientLead =
    kind === "created"
      ? booking.status === "confirmed"
        ? "Thank you — your booking is confirmed."
        : "Thank you — we've received your booking request and will confirm shortly."
      : "Your booking has been updated.";

  const clientSubject =
    kind === "created"
      ? booking.status === "confirmed"
        ? `Booking confirmed — L'Beau Clinique (${booking.requested_date})`
        : `Booking received — L'Beau Clinique (${booking.requested_date})`
      : `Booking updated — L'Beau Clinique`;

  const adminSubject =
    kind === "created"
      ? `New booking: ${booking.client_name}`
      : `Booking updated: ${booking.client_name}`;

  const calendarHtml =
    calendar != null
      ? `
      <p style="margin-top:18px;margin-bottom:8px;font-size:14px;color:#5c4f42"><strong>Add to your calendar</strong></p>
      <p style="margin:0;font-size:14px;line-height:1.8">
        <a href="${escapeHtml(icsPageUrl)}" style="color:#8b6914">Download .ics (Apple / Outlook)</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(googleCalendarProxyUrl)}" style="color:#8b6914">Open in Google Calendar</a>
      </p>
      <p style="margin-top:10px;font-size:12px;color:#776b5f">A calendar file is also attached when supported.</p>
    `
      : "";

  const twilioReady = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      (process.env.TWILIO_FROM_NUMBER?.trim() ||
        process.env.TWILIO_PHONE_NUMBER?.trim()),
  );

  const smsNote =
    booking.client_phone && twilioReady
      ? `<p style="margin-top:14px;font-size:14px;color:#5c4f42">We've also sent a short confirmation text to ${escapeHtml(booking.client_phone)}.</p>`
      : "";

  const clientHtml = `
    <div style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.6;color:#2a211b;max-width:520px">
      <p>Hello ${escapeHtml(booking.client_name)},</p>
      <p>${escapeHtml(clientLead)}</p>
      <table style="margin:16px 0;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#776b5f">Treatment</td><td>${treatmentLine}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#776b5f">When</td><td>${escapeHtml(whenLine)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#776b5f">${kind === "created" ? "Status" : "Update"}</td><td>${escapeHtml(statusNote)}</td></tr>
      </table>
      ${booking.notes ? `<p style="margin-top:12px"><strong>Your note:</strong> ${escapeHtml(booking.notes)}</p>` : ""}
      ${smsNote}
      ${calendarHtml}
      <p style="margin-top:20px;font-size:14px;color:#776b5f">L'Beau Clinique · Milton Keynes</p>
    </div>
  `;

  const adminHtml = `
    <div style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.6;color:#2a211b;max-width:520px">
      <p><strong>${kind === "created" ? "New booking" : "Booking updated"}</strong></p>
      <table style="margin:12px 0;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#776b5f">Client</td><td>${escapeHtml(booking.client_name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#776b5f">Email</td><td>${escapeHtml(booking.client_email)}</td></tr>
        ${booking.client_phone ? `<tr><td style="padding:4px 12px 4px 0;color:#776b5f">Phone</td><td>${escapeHtml(booking.client_phone)}</td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0;color:#776b5f">Treatment</td><td>${treatmentLine}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#776b5f">When</td><td>${escapeHtml(whenLine)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#776b5f">Status</td><td>${escapeHtml(booking.status)}</td></tr>
      </table>
      ${booking.notes ? `<p><strong>Notes:</strong> ${escapeHtml(booking.notes)}</p>` : ""}
      ${calendar != null ? `<p style="margin-top:12px;font-size:14px"><a href="${escapeHtml(icsPageUrl)}">Download .ics</a> · <a href="${escapeHtml(googleCalendarProxyUrl)}">Google Calendar</a></p>` : ""}
      <p style="font-size:12px;color:#776b5f">Booking id: ${booking.id}</p>
    </div>
  `;

  const resend = new Resend(apiKey);

  const clientAttachments =
    calendar != null
      ? [
          {
            filename: `lbeau-booking-${booking.id.slice(0, 8)}.ics`,
            content: Buffer.from(calendar.ics, "utf8"),
            contentType: "text/calendar; charset=utf-8",
          },
        ]
      : undefined;

  const [toClient, toAdmin, smsResult] = await Promise.all([
    resend.emails.send({
      from,
      to: booking.client_email,
      subject: clientSubject,
      html: clientHtml,
      ...(clientAttachments ? { attachments: clientAttachments } : {}),
    }),
    resend.emails.send({
      from,
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml,
    }),
    smsPromise,
  ]);

  if (toClient.error) {
    return { ok: false, error: toClient.error.message };
  }
  if (toAdmin.error) {
    return { ok: false, error: toAdmin.error.message };
  }
  if (!smsResult.ok) {
    console.error("sendBookingSms", smsResult.error);
  }

  return { ok: true };
}
