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

## Booking emails (Resend)

Set these **server-only** variables (e.g. Vercel project settings):

- `RESEND_API_KEY` — from [Resend](https://resend.com) API keys
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase **Settings → API → service_role** (never expose to the browser)
- `BOOKING_EMAIL_FROM` — verified sender, e.g. `L Beaux <bookings@yourdomain.com>` (use Resend’s test sender `onboarding@resend.dev` only while testing)
- `BOOKING_ADMIN_EMAIL` (optional) — overrides clinic copy recipient; defaults to `notification_email` from `booking_settings` or `lbeauclinique@gmail.com`

After a booking is created from `/book` or `/admin`, or when status changes in admin, the app sends **two** emails: one to the client and one to the clinic (if `RESEND_API_KEY` is missing, sends are skipped with no error to the user).

**Optional webhook:** Create the same secret as `BOOKING_NOTIFY_WEBHOOK_SECRET` and add a Supabase **Database Webhook** on `bookings` pointing to `POST https://YOUR_DOMAIN/api/booking-notify` with header `Authorization: Bearer YOUR_SECRET`. Only needed for bookings inserted outside the Next.js app (otherwise server actions already notify).

See `.env.example` in the repo.

## Clinic Google Calendar (API sync)

Optional: each booking can **create or update an event** on your Google Calendar via a **Google Cloud service account**. Public bookings and admin changes call the Calendar API (same time window as the ICS download).

1. In [Google Cloud Console](https://console.cloud.google.com): create a project, enable **Google Calendar API**, create a **service account**, add a JSON key.
2. Copy the service account **client email** and **private key** into Vercel env (see `.env.example`). Set **`GOOGLE_CALENDAR_CALENDAR_ID`** to the calendar id — usually your Gmail address (e.g. `lbeauclinique@gmail.com`).
3. In Google Calendar **settings → Share with specific people**, share **your** clinic calendar with the **service account email** and grant **Make changes to events**.
4. In Supabase SQL Editor, run **`supabase/ensure_google_calendar_sync.sql`** once (recommended). It adds `google_calendar_event_id`, sync metadata columns, and an **`ensure_booking_calendar_columns`** RPC the app calls so the schema stays aligned. Fresh installs can rely on full **`schema.sql`** instead.

If these variables are unset, the app skips Calendar API calls and behaviour is unchanged.

**If sync still fails:** open **`bookings`** in Supabase Table Editor and check **`google_calendar_sync_error`** on the row — the server writes the last Google/API or DB error there. **`google_calendar_last_success_at`** is set when an event is created or updated successfully.

**Troubleshooting:** After deployment, set **`GOOGLE_CALENDAR_DIAGNOSTIC_SECRET`** to a long random string in Vercel, redeploy, then open  
`https://YOUR_DOMAIN/api/health/google-calendar?secret=THAT_STRING`  
It checks env vars, JWT auth, Google calendar access, and whether calendar sync columns exist — without creating events. Remove the secret from Vercel when finished.

## Treatment duration and price (optional columns)

If your database was created before these fields existed, run this once in the SQL Editor:

```sql
alter table public.treatments add column if not exists duration_minutes integer;
alter table public.treatments add column if not exists price_label text;
```

Or re-run the full `schema.sql`, which includes the same `alter table` statements. Per-treatment `duration_minutes` overrides the parent service default for booking slot length; `price_label` is shown on the marketing site and booking UI when set.

## Admin uploads / saves blocked (RLS)

If images upload but do not appear on the service, or treatments never stay saved, the JWT email may not match what `is_admin()` expects. Run **`supabase/fix_admin_access.sql`** once in the SQL Editor (it updates `is_admin()` to read email from the token and `user_metadata`). Then sign out of `/admin` and sign in again with `lbeauclinique@gmail.com`.
