/**
 * Triggers the same Google Calendar sync as the admin "Retry" button.
 * Use after creating/updating a booking so sync runs via the API route (reliable
 * on Vercel) instead of only inside a server action.
 */
export async function requestGoogleCalendarSync(bookingId: string): Promise<void> {
  const res = await fetch("/api/calendar/retry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    console.warn("Google Calendar sync request failed", res.status, data.error);
  }
}
