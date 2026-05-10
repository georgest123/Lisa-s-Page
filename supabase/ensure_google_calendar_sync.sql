-- Run this entire file once in Supabase SQL Editor (Calendar sync / failsafe setup).
-- Safe to re-run: uses IF NOT EXISTS and replaces the RPC.

alter table public.bookings add column if not exists google_calendar_event_id text;
alter table public.bookings add column if not exists google_calendar_sync_error text;
alter table public.bookings add column if not exists google_calendar_sync_attempted_at timestamptz;
alter table public.bookings add column if not exists google_calendar_last_success_at timestamptz;

-- Called by the Next.js server (service role) before syncing — keeps columns present if someone skipped schema.sql.
create or replace function public.ensure_booking_calendar_columns()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  execute 'alter table public.bookings add column if not exists google_calendar_event_id text';
  execute 'alter table public.bookings add column if not exists google_calendar_sync_error text';
  execute 'alter table public.bookings add column if not exists google_calendar_sync_attempted_at timestamptz';
  execute 'alter table public.bookings add column if not exists google_calendar_last_success_at timestamptz';
  return json_build_object('ok', true);
exception when others then
  return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.ensure_booking_calendar_columns() from public;
grant execute on function public.ensure_booking_calendar_columns() to service_role;
