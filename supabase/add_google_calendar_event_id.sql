-- Prefer running ensure_google_calendar_sync.sql (adds event id + sync metadata + RPC).
alter table public.bookings add column if not exists google_calendar_event_id text;
