-- Run once in Supabase SQL Editor to enable Stripe booking deposits.
-- Safe to re-run (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS).

alter table public.booking_settings add column if not exists deposit_enabled boolean not null default false;
alter table public.booking_settings add column if not exists deposit_amount_cents integer not null default 0;

alter table public.bookings add column if not exists deposit_cents integer;
alter table public.bookings add column if not exists stripe_checkout_session_id text;
alter table public.bookings add column if not exists stripe_payment_intent_id text;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (
  status in ('pending', 'pending_payment', 'confirmed', 'completed', 'cancelled')
);

drop policy if exists "Anyone can create booking requests" on public.bookings;
create policy "Anyone can create booking requests"
  on public.bookings for insert
  with check (status in ('pending', 'confirmed', 'pending_payment'));
