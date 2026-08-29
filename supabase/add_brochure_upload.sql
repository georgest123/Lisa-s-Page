/* Run in Supabase SQL Editor. Safe to re-run. */

alter table public.booking_settings
  add column if not exists brochure_file_url text;

alter table public.booking_settings
  add column if not exists brochure_file_name text;

alter table public.booking_settings
  add column if not exists brochure_uploaded_at timestamptz;

insert into storage.buckets (id, name, public)
values ('brochures', 'brochures', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can read brochures" on storage.objects;
create policy "Anyone can read brochures"
  on storage.objects for select
  using (bucket_id = 'brochures');

drop policy if exists "Admin can upload brochures" on storage.objects;
create policy "Admin can upload brochures"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'brochures' and public.is_admin());

drop policy if exists "Admin can update brochures" on storage.objects;
create policy "Admin can update brochures"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'brochures' and public.is_admin())
  with check (bucket_id = 'brochures' and public.is_admin());

drop policy if exists "Admin can delete brochures" on storage.objects;
create policy "Admin can delete brochures"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'brochures' and public.is_admin());
