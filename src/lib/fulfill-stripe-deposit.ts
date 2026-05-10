import type Stripe from "stripe";
import { sendBookingNotifications } from "@/lib/booking-emails";
import { syncBookingWithGoogleCalendar } from "@/lib/google-calendar-sync";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { BookingStatus } from "@/lib/supabase/types";

/**
 * After Stripe Checkout completes, mark the booking paid and run the same
 * notifications + calendar sync as a normal confirmed booking.
 */
export async function fulfillStripeDeposit(
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; error?: string }> {
  const bookingId =
    session.metadata?.booking_id?.trim() ??
    session.client_reference_id?.trim() ??
    "";
  if (!bookingId) {
    return { ok: false, error: "Missing booking id on session" };
  }

  if (session.payment_status !== "paid") {
    return { ok: true };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent &&
          typeof session.payment_intent === "object" &&
          "id" in session.payment_intent
        ? (session.payment_intent as { id: string }).id
        : null;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" };
  }

  const { data: bookingRow, error: loadErr } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .maybeSingle();

  if (loadErr || !bookingRow) {
    return { ok: false, error: loadErr?.message ?? "Booking not found" };
  }

  if (bookingRow.status !== "pending_payment") {
    return { ok: true };
  }

  const { data: settings } = await supabase
    .from("booking_settings")
    .select("booking_mode")
    .eq("id", true)
    .maybeSingle();

  const mode = settings?.booking_mode ?? "instant";
  const nextStatus: BookingStatus =
    mode === "instant" ? "confirmed" : "pending";

  const { data: updated, error: updErr } = await supabase
    .from("bookings")
    .update({
      status: nextStatus,
      stripe_payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: session.id,
    })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();

  if (updErr) {
    return { ok: false, error: updErr.message };
  }
  if (!updated) {
    return { ok: true };
  }

  await syncBookingWithGoogleCalendar(bookingId);
  await sendBookingNotifications(bookingId, "created");
  return { ok: true };
}
