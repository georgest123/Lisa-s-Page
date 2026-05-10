"use server";

import { deleteGoogleCalendarEventForBooking } from "@/lib/google-calendar-sync";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function deleteBookingPermanently(
  bookingId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Server configuration error" };
  }

  await deleteGoogleCalendarEventForBooking(bookingId);

  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
