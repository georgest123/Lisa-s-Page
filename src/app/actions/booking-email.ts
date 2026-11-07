"use server";

import { sendBookingNotifications } from "@/lib/booking-emails";
import type { BookingNotifyKind } from "@/lib/booking-emails";

/** Sends booking emails (+ SMS when configured). Prefer awaiting this so skips/errors are logged. */
export async function notifyBookingByEmail(
  bookingId: string,
  kind: BookingNotifyKind,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  try {
    const result = await sendBookingNotifications(bookingId, kind);
    if (!result.ok) {
      console.error("notifyBookingByEmail failed", bookingId, result.error);
    } else if (result.skipped) {
      console.warn("notifyBookingByEmail skipped", bookingId, result.skipped);
    } else {
      console.info("notifyBookingByEmail sent", bookingId, kind);
    }
    return result;
  } catch (error) {
    console.error("notifyBookingByEmail", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Notify failed",
    };
  }
}
