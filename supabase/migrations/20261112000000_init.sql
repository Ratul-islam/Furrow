-- Furrow schema. One field per row in `fields`; everything else hangs off field_id.
-- Data is public, read-only for the app (anon role). Writes happen only through
-- the service role (seed.sql / pipelines).

create table if not exists public.fields (
  id text primary key,
  name text not null,
  upazila text,
  district text,
  lat numeric(5, 2) not null,          -- rounded to 0.1 degree; no exact boundary stored
  lon numeric(5, 2) not null,
  area_ha numeric,
  land_type text,
  soil jsonb,
  data_through date,
  created_at timestamptz not null default now()
);

create table if not exists public.field_meta (
  field_id text primary key references public.fields (id) on delete cascade,
  generated date,
  thresholds jsonb,
  trends jsonb,
  ndvi_peaks jsonb,
  cmip6_deltas jsonb,
  boro_window jsonb,
  power_notes jsonb
);

-- NASA POWER, aggregated ------------------------------------------------------
create table if not exists public.climate_annual (
  field_id text references public.fields (id) on delete cascade,
  year int,
  tmean numeric, tmax numeric, rain_mm numeric,
  heat_days int, heat_days_mar_apr int,
  aman_rain_mm numeric, aman_dry_spell int,
  heavy_rain_days int, max_day_rain numeric, rain_jul_sep numeric, rain_nov_apr numeric,
  gwet_root numeric, gwet_root_dry numeric,
  primary key (field_id, year)
);

create table if not exists public.climate_monthly (
  field_id text references public.fields (id) on delete cascade,
  month int check (month between 1 and 12),
  tmax numeric, tmin numeric,
  rain_mm numeric, rain_p20 numeric, rain_p80 numeric,
  et0_mm numeric, heat_days numeric, hot38_days numeric, cold_days numeric, heavy_days numeric, gwet_root numeric,
  rain_current numeric, tmax_current numeric, gwet_root_current numeric,
  primary key (field_id, month)
);

create table if not exists public.climate_monthly_series (
  field_id text references public.fields (id) on delete cascade,
  year int, month int, days int,
  tmax numeric, tmin numeric, rain_mm numeric, et0_mm numeric,
  heat_days int, hot38_days int, cold_days int, heavy_days int, gwet_root numeric,
  primary key (field_id, year, month)
);

create table if not exists public.climate_recent (
  field_id text references public.fields (id) on delete cascade,
  date date,
  tmax numeric, tmin numeric, rain_mm numeric,
  gwet_root numeric, gwet_top numeric, rh numeric,
  primary key (field_id, date)
);

-- MODIS MOD13Q1 -----------------------------------------------------------------
create table if not exists public.ndvi (
  field_id text references public.fields (id) on delete cascade,
  date date,
  ndvi numeric,
  reliability int,                      -- MOD13Q1 pixel reliability: 0 good, 1 marginal, 2 snow, 3 cloudy
  primary key (field_id, date)
);

create table if not exists public.ndvi_climatology (
  field_id text references public.fields (id) on delete cascade,
  doy int,
  mean numeric, p10 numeric, p90 numeric,
  current numeric, current_reliability int,
  primary key (field_id, doy)
);

-- Climate futures (observed baseline + NEX-GDDP-CMIP6 deltas) --------------------
create table if not exists public.futures (
  field_id text references public.fields (id) on delete cascade,
  id text,
  model text, scenario text, horizon text,
  has_rain_change boolean not null default true,
  monthly jsonb not null,               -- [{month, rain_mm, et0_mm, heat_days, hot38_days, cold_days, tmax}]
  primary key (field_id, id)
);

-- Drone ------------------------------------------------------------------------
create table if not exists public.drone_flights (
  id text primary key,
  field_id text references public.fields (id) on delete cascade,
  flown_on date,
  crop text, stage text, camera text,
  altitude_m numeric, gsd_cm numeric,
  cols int, rows int, cell_m numeric,
  canopy jsonb not null,                -- rows x cols grid of canopy cover %, null outside the field
  mean_canopy numeric, p10_canopy numeric, p90_canopy numeric, low_cover_pct numeric,
  modis_ndvi numeric, modis_date date,
  is_demo boolean not null default true
);

create table if not exists public.drone_zones (
  id bigint generated always as identity primary key,
  flight_id text references public.drone_flights (id) on delete cascade,
  label text, kind text, severity text,
  x int, y int, w int, h int,
  note text
);

-- Crops, rotations, predictions, sources -----------------------------------------
create table if not exists public.crops (
  id text primary key,
  heat_c numeric,
  name text, family text, season text, water text,
  kc jsonb, sensitive jsonb, sensitive_label text,
  legume boolean, net_bdt_ha numeric, source text
);

create table if not exists public.rotations (
  id text primary key,
  field_id text references public.fields (id) on delete cascade,
  name text, short text, is_current boolean,
  slots jsonb not null,                 -- [{crop, start (month), months}]
  note text
);

create table if not exists public.predictions (
  field_id text references public.fields (id) on delete cascade,
  id text,
  title text, value numeric, unit text,
  range_low numeric, range_high numeric,
  method text, detail jsonb,
  primary key (field_id, id)
);

create table if not exists public.sources (
  id text primary key,
  name text, product text, doi text, url text, use text, kind text
);

-- Read-only public access -----------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'fields', 'field_meta', 'climate_annual', 'climate_monthly', 'climate_monthly_series',
    'climate_recent', 'ndvi', 'ndvi_climatology', 'futures', 'drone_flights', 'drone_zones',
    'crops', 'rotations', 'predictions', 'sources'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
