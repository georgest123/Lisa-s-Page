create extension if not exists "pgcrypto";

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  image_url text,
  duration_minutes integer not null default 45,
  price_label text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.treatments add column if not exists duration_minutes integer;
alter table public.treatments add column if not exists price_label text;

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null unique check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  enabled boolean not null default true
);

create table if not exists public.booking_settings (
  id boolean primary key default true,
  slot_interval_minutes integer not null default 15,
  buffer_minutes integer not null default 10,
  minimum_notice_hours integer not null default 24,
  deposit_rule text not null default 'Optional later',
  booking_mode text not null default 'instant' check (
    booking_mode in ('instant', 'request')
  ),
  notification_email text not null default 'lbeauclinique@gmail.com',
  admin_email text not null default 'lbeauclinique@gmail.com',
  updated_at timestamptz not null default now(),
  constraint single_settings_row check (id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text not null,
  client_phone text,
  service_id uuid references public.services(id) on delete set null,
  treatment_id uuid references public.treatments(id) on delete set null,
  requested_date date not null,
  requested_time time not null,
  notes text,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'completed', 'cancelled')
  ),
  created_at timestamptz not null default now()
);

alter table public.services add column if not exists image_url text;
alter table public.booking_settings add column if not exists booking_mode text not null default 'instant';
alter table public.booking_settings add column if not exists notification_email text not null default 'lbeauclinique@gmail.com';
alter table public.booking_settings add column if not exists admin_email text not null default 'lbeauclinique@gmail.com';

alter table public.bookings add column if not exists google_calendar_event_id text;

with ranked_services as (
  select
    id,
    first_value(id) over (
      partition by name
      order by sort_order, created_at, id
    ) as keep_id,
    row_number() over (
      partition by name
      order by sort_order, created_at, id
    ) as row_number
  from public.services
)
update public.treatments
set service_id = ranked_services.keep_id
from ranked_services
where public.treatments.service_id = ranked_services.id
  and ranked_services.row_number > 1;

with ranked_services as (
  select
    id,
    first_value(id) over (
      partition by name
      order by sort_order, created_at, id
    ) as keep_id,
    row_number() over (
      partition by name
      order by sort_order, created_at, id
    ) as row_number
  from public.services
)
update public.bookings
set service_id = ranked_services.keep_id
from ranked_services
where public.bookings.service_id = ranked_services.id
  and ranked_services.row_number > 1;

with ranked_services as (
  select
    id,
    row_number() over (
      partition by name
      order by sort_order, created_at, id
    ) as row_number
  from public.services
)
delete from public.services
using ranked_services
where public.services.id = ranked_services.id
  and ranked_services.row_number > 1;

with ranked_treatments as (
  select
    id,
    first_value(id) over (
      partition by service_id, name
      order by sort_order, created_at, id
    ) as keep_id,
    row_number() over (
      partition by service_id, name
      order by sort_order, created_at, id
    ) as row_number
  from public.treatments
)
update public.bookings
set treatment_id = ranked_treatments.keep_id
from ranked_treatments
where public.bookings.treatment_id = ranked_treatments.id
  and ranked_treatments.row_number > 1;

with ranked_treatments as (
  select
    id,
    row_number() over (
      partition by service_id, name
      order by sort_order, created_at, id
    ) as row_number
  from public.treatments
)
delete from public.treatments
using ranked_treatments
where public.treatments.id = ranked_treatments.id
  and ranked_treatments.row_number > 1;

create unique index if not exists services_name_key on public.services (name);
create unique index if not exists treatments_service_name_key on public.treatments (service_id, name);

alter table public.services enable row level security;
alter table public.treatments enable row level security;
alter table public.availability enable row level security;
alter table public.booking_settings enable row level security;
alter table public.bookings enable row level security;

-- Matches scheduling-studio login; checks JWT email (OTP puts it on the token).
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

drop policy if exists "Anyone can read active services" on public.services;
create policy "Anyone can read active services"
  on public.services for select
  using (active = true);

drop policy if exists "Admin can manage services" on public.services;
create policy "Admin can manage services"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can read active treatments" on public.treatments;
create policy "Anyone can read active treatments"
  on public.treatments for select
  using (active = true);

drop policy if exists "Admin can manage treatments" on public.treatments;
create policy "Admin can manage treatments"
  on public.treatments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can read availability" on public.availability;
create policy "Anyone can read availability"
  on public.availability for select
  using (true);

drop policy if exists "Admin can manage availability" on public.availability;
create policy "Admin can manage availability"
  on public.availability for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can read booking settings" on public.booking_settings;
create policy "Anyone can read booking settings"
  on public.booking_settings for select
  using (true);

drop policy if exists "Admin can manage booking settings" on public.booking_settings;
create policy "Admin can manage booking settings"
  on public.booking_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can create booking requests" on public.bookings;
create policy "Anyone can create booking requests"
  on public.bookings for insert
  with check (status in ('pending', 'confirmed'));

drop policy if exists "Admin can manage bookings" on public.bookings;
create policy "Admin can manage bookings"
  on public.bookings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can read service images" on storage.objects;
create policy "Anyone can read service images"
  on storage.objects for select
  using (bucket_id = 'service-images');

drop policy if exists "Admin can upload service images" on storage.objects;
create policy "Admin can upload service images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'service-images' and public.is_admin());

drop policy if exists "Admin can update service images" on storage.objects;
create policy "Admin can update service images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'service-images' and public.is_admin())
  with check (bucket_id = 'service-images' and public.is_admin());

drop policy if exists "Admin can delete service images" on storage.objects;
create policy "Admin can delete service images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'service-images' and public.is_admin());

insert into public.services
  (name, category, description, duration_minutes, price_label, sort_order)
values
  (
    'Cryo 21',
    'Lipolysis Fat Freezing',
    'Targeted cold therapy for lifting, sculpting, firming, and non-invasive fat reduction.',
    45,
    'From £95',
    1
  ),
  (
    'Touch Skin 21',
    'Skin Renewal',
    'Advanced skin-focused treatments for lifting, texture, scarring, pigmentation, and delicate eye areas.',
    60,
    'Bespoke',
    2
  ),
  (
    'Face 21',
    'Thermal Energy Sculpt',
    'Thermal energy, micro current, and pH21 care to lift, firm, tone, sculpt, and volumise.',
    50,
    'Bespoke',
    3
  )
on conflict (name) do update set
  category = excluded.category,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  price_label = excluded.price_label,
  sort_order = excluded.sort_order;

insert into public.treatments (service_id, name, sort_order)
select services.id, treatment.name, treatment.sort_order
from public.services
join (
  values
    ('Cryo 21', 'Full face lift', 1),
    ('Cryo 21', 'Neck lift', 2),
    ('Cryo 21', 'Jawline sculpting', 3),
    ('Cryo 21', 'Fat freezing', 4),
    ('Cryo 21', 'Cellulite fat freezing', 5),
    ('Touch Skin 21', 'Eyelid lift', 1),
    ('Touch Skin 21', 'Eye bag removal', 2),
    ('Touch Skin 21', 'Acne', 3),
    ('Touch Skin 21', 'Scars / post operation', 4),
    ('Touch Skin 21', 'Lines & wrinkles', 5),
    ('Touch Skin 21', 'Age & sun spots', 6),
    ('Face 21', 'Thermal energy', 1),
    ('Face 21', 'Micro current', 2),
    ('Face 21', 'Lift', 3),
    ('Face 21', 'Firm', 4),
    ('Face 21', 'Tone', 5)
) as treatment(service_name, name, sort_order)
  on treatment.service_name = services.name
on conflict (service_id, name) do nothing;

insert into public.availability (day_of_week, opens_at, closes_at, enabled)
values
  (0, '09:30', '19:00', true),
  (1, '09:30', '18:30', true),
  (2, '09:30', '18:00', true),
  (3, '09:30', '18:00', true),
  (4, '09:30', '20:00', true),
  (5, '09:00', '17:00', true),
  (6, null, null, false)
on conflict (day_of_week) do nothing;

insert into public.booking_settings (id)
values (true)
on conflict (id) do update set
  booking_mode = 'instant',
  notification_email = 'lbeauclinique@gmail.com',
  admin_email = 'lbeauclinique@gmail.com';
