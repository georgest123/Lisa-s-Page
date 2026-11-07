-- 24h appointment reminder emails. Run once in Supabase SQL Editor.

alter table public.bookings
  add column if not exists reminder_email_sent_at timestamptz;
