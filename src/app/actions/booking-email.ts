"use server";

import { sendBookingNotifications } from "@/lib/booking-emails";
import type { BookingNotifyKind } from "@/lib/booking-emails";
import { syncBookingWithGoogleCalendar } from "@/lib/google-calendar-sync";

export async function notifyBookingByEmail(
  bookingId: string,
  kind: BookingNotifyKind,
): Promise<void> {
  try {
    await syncBookingWithGoogleCalendar(bookingId);
    await sendBookingNotifications(bookingId, kind);
  } catch (error) {
    console.error("notifyBookingByEmail", error);
  }
}
