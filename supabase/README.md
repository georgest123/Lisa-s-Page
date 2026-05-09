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
Admin write access is locked to `lbeauclinique@gmail.com` through Supabase Auth.

## Admin login

The `/admin` page uses Supabase email OTP codes. In Supabase:

1. Go to Authentication > Providers.
2. Make sure Email provider is enabled.
3. Keep OTP email login enabled.
4. Use `lbeauclinique@gmail.com` on `/admin`.

If signups are disabled, invite `lbeauclinique@gmail.com` under Authentication > Users.

## Service images

The schema creates a public Storage bucket called `service-images`.
Admins can upload service pictures from `/admin`; the public site can read them.

## Instant booking

The public `/book` page creates confirmed bookings when booking mode is `instant`.
Email notifications are not sent yet; add an email provider such as Resend for that.
