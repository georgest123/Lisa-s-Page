import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/site-url";
import { getStripe, getStripeCurrency } from "@/lib/stripe-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a Stripe Checkout Session for a booking in pending_payment status.
 * Anonymous clients call this after inserting their row — amount comes from DB settings.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY)." },
      { status: 503 },
    );
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfigured (Supabase service role)." },
      { status: 503 },
    );
  }

  let body: { bookingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const bookingId = body.bookingId?.trim();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("booking_settings")
    .select("deposit_enabled, deposit_amount_cents")
    .eq("id", true)
    .maybeSingle();

  const depositCents = settings?.deposit_amount_cents ?? 0;
  if (!settings?.deposit_enabled || depositCents <= 0) {
    return NextResponse.json(
      { error: "Deposits are not enabled or amount is zero." },
      { status: 400 },
    );
  }

  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("id, status, client_email, client_name")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Booking is not awaiting deposit payment." },
      { status: 400 },
    );
  }

  await supabase
    .from("bookings")
    .update({ deposit_cents: depositCents })
    .eq("id", bookingId);

  const siteUrl = getPublicSiteUrl();
  const currency = getStripeCurrency();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: "Appointment deposit",
            description: `${booking.client_name} · ref ${bookingId.slice(0, 8)}`,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    customer_email: booking.client_email,
    client_reference_id: bookingId,
    metadata: { booking_id: bookingId },
    success_url: `${siteUrl}/book/deposit-return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/book?cancelled=deposit`,
  });

  await supabase
    .from("bookings")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", bookingId);

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
