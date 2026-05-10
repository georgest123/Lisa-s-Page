"use server";

import { sendBookingNotifications } from "@/lib/booking-emails";
import type { BookingNotifyKind } from "@/lib/booking-emails";

/** Sends booking emails only. Call `requestGoogleCalendarSync` from the client after writes so Calendar uses `/api/calendar/retry` (reliable on Vercel). */
export async function notifyBookingByEmail(
  bookingId: string,
  kind: BookingNotifyKind,
): Promise<void> {
  try {
    await sendBookingNotifications(bookingId, kind);
  } catch (error) {
    console.error("notifyBookingByEmail", error);
  }
}
