import Stripe from "stripe";

let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Stripe(key);
  return cached;
}

export function getStripeCurrency(): string {
  return (process.env.STRIPE_CURRENCY ?? "gbp").trim().toLowerCase() || "gbp";
}
