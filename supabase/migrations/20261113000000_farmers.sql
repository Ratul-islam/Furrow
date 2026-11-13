-- Farmer profiles (field drawn on the map + onboarding answers) and drone-check requests.
-- The app may INSERT (anon) but never read other farmers' rows: no SELECT policy for anon.
-- The drone team reads these with the service role (dashboard / back office).

create table if not exists public.farm_profiles (
  id text primary key,
  created_at timestamptz not null default now(),
  field jsonb not null,       -- {points: [[lat, lng], ...], areaM2, center}
  answers jsonb not null
);

create table if not exists public.drone_requests (
  id text primary key,
  created_at timestamptz not null default now(),
  farm_id text references public.farm_profiles (id) on delete set null,
  checks text[] not null default '{}',
  preferred_date text,
  phone text,                 -- personal data: keep access to the service role only
  note text,
  status text not null default 'requested' check (status in ('requested', 'scheduled', 'surveyed', 'report'))
);

alter table public.farm_profiles enable row level security;
alter table public.drone_requests enable row level security;

drop policy if exists "app can submit" on public.farm_profiles;
create policy "app can submit" on public.farm_profiles for insert to anon, authenticated with check (true);
drop policy if exists "app can submit" on public.drone_requests;
create policy "app can submit" on public.drone_requests for insert to anon, authenticated with check (true);
