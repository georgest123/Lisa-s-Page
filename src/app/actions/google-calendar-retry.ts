"use server";

import { syncBookingWithGoogleCalendar } from "@/lib/google-calendar-sync";

/** Re-run Calendar API sync for one booking (admin “Retry” button). */
export async function retryGoogleCalendarSync(bookingId: string): Promise<void> {
  await syncBookingWithGoogleCalendar(bookingId);
}
