create table if not exists public.civic_external_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists civic_external_cache_expires_at_idx
  on public.civic_external_cache (expires_at);

create table if not exists public.civic_coverage_gaps (
  id bigserial primary key,
  gap_key text not null unique,
  lat numeric,
  lng numeric,
  query text,
  nearest_source_id text,
  nearest_source_name text,
  nearest_distance_miles numeric,
  request_city text,
  request_region text,
  request_country text,
  source_count integer not null default 0,
  seen_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists civic_coverage_gaps_last_seen_at_idx
  on public.civic_coverage_gaps (last_seen_at desc);

create index if not exists civic_coverage_gaps_distance_idx
  on public.civic_coverage_gaps (nearest_distance_miles);

create or replace function public.record_civic_coverage_gap(
  p_gap_key text,
  p_lat numeric default null,
  p_lng numeric default null,
  p_query text default null,
  p_nearest_source_id text default null,
  p_nearest_source_name text default null,
  p_nearest_distance_miles numeric default null,
  p_request_city text default null,
  p_request_region text default null,
  p_request_country text default null,
  p_source_count integer default 0
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.civic_coverage_gaps (
    gap_key,
    lat,
    lng,
    query,
    nearest_source_id,
    nearest_source_name,
    nearest_distance_miles,
    request_city,
    request_region,
    request_country,
    source_count
  )
  values (
    p_gap_key,
    p_lat,
    p_lng,
    nullif(p_query, ''),
    p_nearest_source_id,
    p_nearest_source_name,
    p_nearest_distance_miles,
    p_request_city,
    p_request_region,
    p_request_country,
    p_source_count
  )
  on conflict (gap_key) do update
    set lat = excluded.lat,
        lng = excluded.lng,
        query = excluded.query,
        nearest_source_id = excluded.nearest_source_id,
        nearest_source_name = excluded.nearest_source_name,
        nearest_distance_miles = excluded.nearest_distance_miles,
        request_city = excluded.request_city,
        request_region = excluded.request_region,
        request_country = excluded.request_country,
        source_count = excluded.source_count,
        seen_count = public.civic_coverage_gaps.seen_count + 1,
        last_seen_at = now();
$$;
