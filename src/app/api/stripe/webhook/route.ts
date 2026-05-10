import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillStripeDeposit } from "@/lib/fulfill-stripe-deposit";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured." },
      { status: 503 },
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await fulfillStripeDeposit(session);
    if (!result.ok) {
      console.error("fulfillStripeDeposit", result.error);
      return NextResponse.json(
        { error: result.error ?? "Fulfillment failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
