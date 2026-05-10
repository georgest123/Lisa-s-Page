/* Run this entire file in the Supabase SQL Editor. Safe to re-run. */

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  body text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists policies_slug_key on public.policies (slug);

alter table public.policies enable row level security;

drop policy if exists "Anyone can read active policies" on public.policies;
create policy "Anyone can read active policies"
  on public.policies for select
  using (active = true);

drop policy if exists "Admin can manage policies" on public.policies;
create policy "Admin can manage policies"
  on public.policies for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
