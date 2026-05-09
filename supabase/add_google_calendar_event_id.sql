-- Run once if bookings existed before Google Calendar sync was added.
alter table public.bookings add column if not exists google_calendar_event_id text;
