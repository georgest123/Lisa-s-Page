-- Admin custom appointments: freeform service label + duration (no catalogue row required).
-- Run in Supabase SQL Editor once.

alter table public.bookings
  add column if not exists custom_service_name text;

alter table public.bookings
  add column if not exists custom_duration_minutes integer;

alter table public.bookings
  drop constraint if exists bookings_custom_duration_minutes_check;

alter table public.bookings
  add constraint bookings_custom_duration_minutes_check
  check (
    custom_duration_minutes is null
    or (custom_duration_minutes >= 5 and custom_duration_minutes <= 24 * 60)
  );

-- Public / anonymous inserts must still pick a catalogue service.
-- Admins use the existing "Admin can manage bookings" policy for custom rows.
drop policy if exists "Anyone can create booking requests" on public.bookings;
create policy "Anyone can create booking requests"
  on public.bookings for insert
  with check (
    status in ('pending', 'confirmed', 'pending_payment')
    and service_id is not null
  );
