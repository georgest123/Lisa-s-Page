# Supabase setup

## Environment variables

Add these in Vercel under Project Settings > Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The anon key is safe for browser use, but keep the service role key private.

## Database setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Open `supabase/schema.sql` from this repo.
4. Copy the full SQL into Supabase.
5. Click Run.

This creates:

- `services`
- `treatments`
- `availability`
- `booking_settings`
- `bookings`

The public site can read active services and create pending booking requests.
Admin write access will be locked down with Supabase Auth in the next step.
