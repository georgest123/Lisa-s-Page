/** Fixed public booking deposit (pence). Stripe Checkout and /book use this amount. */
export const BOOKING_DEPOSIT_AMOUNT_CENTS = 2500;

export function formatDepositGBP(
  cents: number = BOOKING_DEPOSIT_AMOUNT_CENTS,
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(cents / 100);
}
