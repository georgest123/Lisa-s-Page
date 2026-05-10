"use server";

import { deleteGoogleCalendarEventById } from "@/lib/google-calendar-sync";

/**
 * Removes the linked Google Calendar event using the id already on the booking row.
 * Database delete is done in the admin UI with the authenticated Supabase client (RLS),
 * so this server action does not require SUPABASE_SERVICE_ROLE_KEY.
 */
export async function removeGoogleCalendarEventIfLinked(
  calendarEventId: string | null | undefined,
): Promise<void> {
  if (!calendarEventId) return;
  await deleteGoogleCalendarEventById(calendarEventId);
}
