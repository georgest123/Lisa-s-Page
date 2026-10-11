/* Set booking deposit to £25 and enable Stripe deposits. Safe to re-run. */

update public.booking_settings
set
  deposit_enabled = true,
  deposit_amount_cents = 2500,
  deposit_rule = '£25 deposit',
  updated_at = now()
where id = true;
