-- Run once in Supabase SQL Editor if admin uploads / saves fail with permission errors.
-- Fixes email matching on the JWT (OTP + metadata) so RLS recognises the studio login.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(trim(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'email', ''),
    ''
  ))) = 'lbeauclinique@gmail.com';
$$;
