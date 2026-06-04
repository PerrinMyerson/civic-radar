create table if not exists public.civic_external_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists civic_external_cache_expires_at_idx
  on public.civic_external_cache (expires_at);

