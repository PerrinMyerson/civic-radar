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

grant execute on function public.record_civic_coverage_gap(
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  integer
) to anon, authenticated, service_role;

create or replace function public.set_civic_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.civic_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  home_region text not null default '',
  notification_email text not null default '',
  notify_frequency text not null default 'daily'
    check (notify_frequency in ('immediate', 'daily', 'weekly', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.civic_profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_version text not null default 'resident-burden-v1';

drop trigger if exists civic_profiles_set_updated_at on public.civic_profiles;
create trigger civic_profiles_set_updated_at
  before update on public.civic_profiles
  for each row
  execute function public.set_civic_updated_at();

create table if not exists public.civic_user_regions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  source_id text,
  jurisdiction_kind text,
  lat numeric,
  lng numeric,
  radius_miles integer not null default 75
    check (radius_miles between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists civic_user_regions_user_id_idx
  on public.civic_user_regions (user_id);

create table if not exists public.civic_user_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_type text not null default 'topic'
    check (topic_type in ('topic', 'bill_keyword', 'agency', 'committee', 'local_body')),
  label text not null,
  query text not null,
  created_at timestamptz not null default now()
);

create index if not exists civic_user_topics_user_id_idx
  on public.civic_user_topics (user_id);

create table if not exists public.civic_private_context (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goals text[] not null default '{}',
  concerns text[] not null default '{}',
  life_context text not null default '',
  policy_priorities jsonb not null default '{}'::jsonb,
  agent_consent boolean not null default false,
  candidate_agent_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists civic_private_context_set_updated_at on public.civic_private_context;
create trigger civic_private_context_set_updated_at
  before update on public.civic_private_context
  for each row
  execute function public.set_civic_updated_at();

create table if not exists public.civic_event_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  title text not null,
  summary text not null default '',
  source_name text not null default '',
  source_url text not null default '',
  event_date text not null default '',
  matched_terms text[] not null default '{}',
  matched_regions text[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'seen', 'dismissed', 'saved')),
  created_at timestamptz not null default now(),
  unique (user_id, event_id, event_kind)
);

create index if not exists civic_event_matches_user_id_idx
  on public.civic_event_matches (user_id, created_at desc);

create table if not exists public.civic_agent_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  title text not null,
  source_url text not null default '',
  brief jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists civic_agent_briefs_user_id_idx
  on public.civic_agent_briefs (user_id, created_at desc);

create table if not exists public.civic_advocacy_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  draft_type text not null check (draft_type in ('comment', 'email', 'testimony', 'call_script')),
  recipient text not null default '',
  body text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved')),
  explicit_approval_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists civic_advocacy_drafts_user_id_idx
  on public.civic_advocacy_drafts (user_id, created_at desc);

create table if not exists public.civic_user_event_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  region_label text not null default '',
  topic_tags text[] not null default '{}',
  position text not null check (position in ('support', 'oppose', 'unsure')),
  urgency integer not null default 3 check (urgency between 1 and 5),
  reason text not null default '',
  desired_outcome text not null default '',
  public_anonymous boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, event_kind)
);

create index if not exists civic_user_event_positions_event_idx
  on public.civic_user_event_positions (event_id, event_kind);

create index if not exists civic_user_event_positions_topic_idx
  on public.civic_user_event_positions using gin (topic_tags);

drop trigger if exists civic_user_event_positions_set_updated_at on public.civic_user_event_positions;
create trigger civic_user_event_positions_set_updated_at
  before update on public.civic_user_event_positions
  for each row
  execute function public.set_civic_updated_at();

create table if not exists public.civic_candidate_queries (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid references auth.users (id) on delete set null,
  requester_role text not null default 'candidate'
    check (requester_role in ('candidate', 'official', 'journalist', 'public')),
  region_label text not null default '',
  topic_query text not null default '',
  question text not null,
  min_threshold integer not null default 5 check (min_threshold between 3 and 100),
  response jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'answered', 'threshold_not_met')),
  created_at timestamptz not null default now()
);

create index if not exists civic_candidate_queries_requester_idx
  on public.civic_candidate_queries (requester_user_id, created_at desc);

create table if not exists public.civic_agent_exchange_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_id text not null default '',
  exchange_kind text not null default 'anonymous_summary',
  consent_snapshot jsonb not null default '{}'::jsonb,
  public_output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.civic_profiles enable row level security;
alter table public.civic_user_regions enable row level security;
alter table public.civic_user_topics enable row level security;
alter table public.civic_private_context enable row level security;
alter table public.civic_event_matches enable row level security;
alter table public.civic_agent_briefs enable row level security;
alter table public.civic_advocacy_drafts enable row level security;
alter table public.civic_user_event_positions enable row level security;
alter table public.civic_candidate_queries enable row level security;
alter table public.civic_agent_exchange_logs enable row level security;

drop policy if exists "Users manage own civic profile" on public.civic_profiles;
create policy "Users manage own civic profile"
  on public.civic_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic regions" on public.civic_user_regions;
create policy "Users manage own civic regions"
  on public.civic_user_regions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic topics" on public.civic_user_topics;
create policy "Users manage own civic topics"
  on public.civic_user_topics
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic private context" on public.civic_private_context;
create policy "Users manage own civic private context"
  on public.civic_private_context
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic matches" on public.civic_event_matches;
create policy "Users manage own civic matches"
  on public.civic_event_matches
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic briefs" on public.civic_agent_briefs;
create policy "Users manage own civic briefs"
  on public.civic_agent_briefs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic advocacy drafts" on public.civic_advocacy_drafts;
create policy "Users manage own civic advocacy drafts"
  on public.civic_advocacy_drafts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic event positions" on public.civic_user_event_positions;
create policy "Users manage own civic event positions"
  on public.civic_user_event_positions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated users create candidate queries" on public.civic_candidate_queries;
create policy "Authenticated users create candidate queries"
  on public.civic_candidate_queries
  for insert
  with check (auth.uid() = requester_user_id);

drop policy if exists "Users read own candidate queries" on public.civic_candidate_queries;
create policy "Users read own candidate queries"
  on public.civic_candidate_queries
  for select
  using (auth.uid() = requester_user_id);

drop policy if exists "Users insert own civic exchange logs" on public.civic_agent_exchange_logs;
create policy "Users insert own civic exchange logs"
  on public.civic_agent_exchange_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users read own civic exchange logs" on public.civic_agent_exchange_logs;
create policy "Users read own civic exchange logs"
  on public.civic_agent_exchange_logs
  for select
  using (auth.uid() = user_id);

create or replace function public.civic_event_signal_summary(
  p_event_id text,
  p_event_kind text default null,
  p_min_count integer default 5
)
returns table (
  event_id text,
  event_kind text,
  total_count integer,
  support_count integer,
  oppose_count integer,
  unsure_count integer,
  average_urgency numeric,
  threshold_met boolean
)
language sql
security definer
set search_path = public
as $$
  with scoped as (
    select *
    from public.civic_user_event_positions
    where event_id = p_event_id
      and (p_event_kind is null or event_kind = p_event_kind)
      and public_anonymous = true
  ),
  counted as (
    select
      p_event_id as event_id,
      coalesce(min(event_kind), p_event_kind, 'federal') as event_kind,
      count(*)::integer as total_count,
      count(*) filter (where position = 'support')::integer as support_count,
      count(*) filter (where position = 'oppose')::integer as oppose_count,
      count(*) filter (where position = 'unsure')::integer as unsure_count,
      round(avg(urgency)::numeric, 2) as average_urgency
    from scoped
  )
  select
    counted.event_id,
    counted.event_kind,
    case when counted.total_count >= p_min_count then counted.total_count else 0 end,
    case when counted.total_count >= p_min_count then counted.support_count else 0 end,
    case when counted.total_count >= p_min_count then counted.oppose_count else 0 end,
    case when counted.total_count >= p_min_count then counted.unsure_count else 0 end,
    case when counted.total_count >= p_min_count then counted.average_urgency else null end,
    counted.total_count >= p_min_count
  from counted;
$$;

grant execute on function public.civic_event_signal_summary(text, text, integer)
  to anon, authenticated, service_role;

create or replace function public.civic_candidate_topic_summary(
  p_region text default '',
  p_topic text default '',
  p_min_count integer default 5
)
returns table (
  region_label text,
  topic_query text,
  total_count integer,
  support_count integer,
  oppose_count integer,
  unsure_count integer,
  average_urgency numeric,
  threshold_met boolean
)
language sql
security definer
set search_path = public
as $$
  with scoped as (
    select *
    from public.civic_user_event_positions
    where public_anonymous = true
      and (
        nullif(trim(p_region), '') is null
        or region_label ilike '%' || trim(p_region) || '%'
      )
      and (
        nullif(trim(p_topic), '') is null
        or exists (
          select 1
          from unnest(topic_tags) as tag
          where tag ilike '%' || trim(p_topic) || '%'
        )
        or reason ilike '%' || trim(p_topic) || '%'
        or desired_outcome ilike '%' || trim(p_topic) || '%'
      )
  ),
  counted as (
    select
      coalesce(nullif(trim(p_region), ''), 'All regions') as region_label,
      coalesce(nullif(trim(p_topic), ''), 'All topics') as topic_query,
      count(*)::integer as total_count,
      count(*) filter (where position = 'support')::integer as support_count,
      count(*) filter (where position = 'oppose')::integer as oppose_count,
      count(*) filter (where position = 'unsure')::integer as unsure_count,
      round(avg(urgency)::numeric, 2) as average_urgency
    from scoped
  )
  select
    counted.region_label,
    counted.topic_query,
    case when counted.total_count >= p_min_count then counted.total_count else 0 end,
    case when counted.total_count >= p_min_count then counted.support_count else 0 end,
    case when counted.total_count >= p_min_count then counted.oppose_count else 0 end,
    case when counted.total_count >= p_min_count then counted.unsure_count else 0 end,
    case when counted.total_count >= p_min_count then counted.average_urgency else null end,
    counted.total_count >= p_min_count
  from counted;
$$;

grant execute on function public.civic_candidate_topic_summary(text, text, integer)
  to anon, authenticated, service_role;

create table if not exists public.civic_events (
  id text primary key,
  event_kind text not null check (event_kind in ('federal', 'local')),
  title text not null,
  summary text not null default '',
  source_name text not null default '',
  source_url text not null default '',
  event_date text not null default '',
  region_label text not null default '',
  source_id text not null default '',
  actionability text not null default 'unknown'
    check (actionability in ('high', 'medium', 'low', 'unknown')),
  source_confidence text not null default 'partial'
    check (source_confidence in ('high', 'partial', 'insufficient')),
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists civic_events_last_seen_at_idx
  on public.civic_events (last_seen_at desc);

create index if not exists civic_events_region_idx
  on public.civic_events (region_label);

create index if not exists civic_events_search_idx
  on public.civic_events using gin (to_tsvector('english', search_text));

create table if not exists public.civic_event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.civic_events (id) on delete cascade,
  source_label text not null,
  source_url text not null,
  source_type text not null default 'official'
    check (source_type in ('official', 'rss', 'api', 'derived')),
  created_at timestamptz not null default now(),
  unique (event_id, source_url)
);

create index if not exists civic_event_sources_event_id_idx
  on public.civic_event_sources (event_id);

create table if not exists public.civic_event_relevance_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null references public.civic_events (id) on delete cascade,
  event_kind text not null check (event_kind in ('federal', 'local')),
  score integer not null default 0 check (score between 0 and 100),
  confidence text not null default 'partial'
    check (confidence in ('high', 'partial', 'insufficient')),
  reasons text[] not null default '{}',
  matched_regions text[] not null default '{}',
  matched_terms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists civic_event_relevance_scores_user_idx
  on public.civic_event_relevance_scores (user_id, score desc);

drop trigger if exists civic_event_relevance_scores_set_updated_at on public.civic_event_relevance_scores;
create trigger civic_event_relevance_scores_set_updated_at
  before update on public.civic_event_relevance_scores
  for each row
  execute function public.set_civic_updated_at();

create table if not exists public.civic_event_burden_scores (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.civic_events (id) on delete cascade,
  event_kind text not null check (event_kind in ('federal', 'local')),
  score integer not null default 0 check (score between 0 and 100),
  label text not null default 'Moderate burden'
    check (label in ('Low burden', 'Moderate burden', 'High burden')),
  source_friction integer not null default 0 check (source_friction between 0 and 20),
  decision_ambiguity integer not null default 0 check (decision_ambiguity between 0 and 20),
  actor_ambiguity integer not null default 0 check (actor_ambiguity between 0 and 20),
  time_ambiguity integer not null default 0 check (time_ambiguity between 0 and 20),
  action_ambiguity integer not null default 0 check (action_ambiguity between 0 and 20),
  reasons text[] not null default '{}',
  computed_at timestamptz not null default now(),
  unique (event_id, event_kind)
);

create index if not exists civic_event_burden_scores_score_idx
  on public.civic_event_burden_scores (score desc);

create table if not exists public.civic_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  notification_kind text not null default 'in_app'
    check (notification_kind in ('in_app', 'email')),
  title text not null,
  summary text not null default '',
  source_url text not null default '',
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  relevance_reasons text[] not null default '{}',
  delivery_state text not null default 'pending'
    check (delivery_state in ('pending', 'queued_no_provider', 'sent', 'failed', 'opened', 'dismissed', 'saved')),
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, event_id, event_kind, notification_kind)
);

create index if not exists civic_notifications_user_idx
  on public.civic_notifications (user_id, created_at desc);

create table if not exists public.civic_user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  region_label text not null default '',
  topic_tags text[] not null default '{}',
  position text not null check (position in ('support', 'oppose', 'unsure')),
  intensity integer not null default 3 check (intensity between 1 and 5),
  affectedness integer not null default 3 check (affectedness between 1 and 5),
  reason text not null default '',
  desired_outcome text not null default '',
  public_anonymous boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, event_kind)
);

create index if not exists civic_user_feedback_event_idx
  on public.civic_user_feedback (event_id, event_kind);

create index if not exists civic_user_feedback_topic_idx
  on public.civic_user_feedback using gin (topic_tags);

drop trigger if exists civic_user_feedback_set_updated_at on public.civic_user_feedback;
create trigger civic_user_feedback_set_updated_at
  before update on public.civic_user_feedback
  for each row
  execute function public.set_civic_updated_at();

create table if not exists public.civic_relevance_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  feedback_type text not null
    check (
      feedback_type in (
        'relevant',
        'not_relevant',
        'wrong_region',
        'wrong_topic',
        'too_late',
        'important_unclear'
      )
    ),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, event_kind, feedback_type)
);

create index if not exists civic_relevance_feedback_event_idx
  on public.civic_relevance_feedback (event_id, event_kind);

create index if not exists civic_relevance_feedback_user_idx
  on public.civic_relevance_feedback (user_id, updated_at desc);

drop trigger if exists civic_relevance_feedback_set_updated_at on public.civic_relevance_feedback;
create trigger civic_relevance_feedback_set_updated_at
  before update on public.civic_relevance_feedback
  for each row
  execute function public.set_civic_updated_at();

create table if not exists public.civic_event_outcomes (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  outcome_status text not null default 'unknown'
    check (outcome_status in ('unknown', 'pending', 'passed', 'failed', 'continued', 'withdrawn')),
  outcome_summary text not null default '',
  outcome_url text not null default '',
  observed_at timestamptz not null default now(),
  unique (event_id, event_kind)
);

create table if not exists public.civic_explanation_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_id text not null,
  event_kind text not null check (event_kind in ('federal', 'local')),
  confidence text not null check (confidence in ('high', 'partial', 'insufficient')),
  source_urls text[] not null default '{}',
  relevance_reasons text[] not null default '{}',
  model_name text not null default 'deterministic-v1',
  explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists civic_explanation_audits_user_idx
  on public.civic_explanation_audits (user_id, created_at desc);

alter table public.civic_events enable row level security;
alter table public.civic_event_sources enable row level security;
alter table public.civic_event_relevance_scores enable row level security;
alter table public.civic_event_burden_scores enable row level security;
alter table public.civic_notifications enable row level security;
alter table public.civic_user_feedback enable row level security;
alter table public.civic_relevance_feedback enable row level security;
alter table public.civic_event_outcomes enable row level security;
alter table public.civic_explanation_audits enable row level security;

drop policy if exists "Anyone can read civic events" on public.civic_events;
create policy "Anyone can read civic events"
  on public.civic_events
  for select
  using (true);

drop policy if exists "Anyone can read civic event sources" on public.civic_event_sources;
create policy "Anyone can read civic event sources"
  on public.civic_event_sources
  for select
  using (true);

drop policy if exists "Anyone can read civic event outcomes" on public.civic_event_outcomes;
create policy "Anyone can read civic event outcomes"
  on public.civic_event_outcomes
  for select
  using (true);

drop policy if exists "Users manage own civic relevance scores" on public.civic_event_relevance_scores;
create policy "Users manage own civic relevance scores"
  on public.civic_event_relevance_scores
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read civic event burden scores" on public.civic_event_burden_scores;
create policy "Anyone can read civic event burden scores"
  on public.civic_event_burden_scores
  for select
  using (true);

drop policy if exists "Users manage own civic notifications" on public.civic_notifications;
create policy "Users manage own civic notifications"
  on public.civic_notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic feedback" on public.civic_user_feedback;
create policy "Users manage own civic feedback"
  on public.civic_user_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own civic relevance feedback" on public.civic_relevance_feedback;
create policy "Users manage own civic relevance feedback"
  on public.civic_relevance_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own civic explanation audits" on public.civic_explanation_audits;
create policy "Users read own civic explanation audits"
  on public.civic_explanation_audits
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own civic explanation audits" on public.civic_explanation_audits;
create policy "Users insert own civic explanation audits"
  on public.civic_explanation_audits
  for insert
  with check (auth.uid() = user_id or user_id is null);

create or replace function public.civic_event_feedback_summary(
  p_event_id text,
  p_event_kind text default null,
  p_min_count integer default 5
)
returns table (
  event_id text,
  event_kind text,
  total_count integer,
  support_count integer,
  oppose_count integer,
  unsure_count integer,
  average_urgency numeric,
  average_affectedness numeric,
  threshold_met boolean
)
language sql
security definer
set search_path = public
as $$
  with scoped as (
    select *
    from public.civic_user_feedback
    where event_id = p_event_id
      and (p_event_kind is null or event_kind = p_event_kind)
      and public_anonymous = true
  ),
  counted as (
    select
      p_event_id as event_id,
      coalesce(min(event_kind), p_event_kind, 'federal') as event_kind,
      count(*)::integer as total_count,
      count(*) filter (where position = 'support')::integer as support_count,
      count(*) filter (where position = 'oppose')::integer as oppose_count,
      count(*) filter (where position = 'unsure')::integer as unsure_count,
      round(avg(intensity)::numeric, 2) as average_urgency,
      round(avg(affectedness)::numeric, 2) as average_affectedness
    from scoped
  )
  select
    counted.event_id,
    counted.event_kind,
    case when counted.total_count >= p_min_count then counted.total_count else 0 end,
    case when counted.total_count >= p_min_count then counted.support_count else 0 end,
    case when counted.total_count >= p_min_count then counted.oppose_count else 0 end,
    case when counted.total_count >= p_min_count then counted.unsure_count else 0 end,
    case when counted.total_count >= p_min_count then counted.average_urgency else null end,
    case when counted.total_count >= p_min_count then counted.average_affectedness else null end,
    counted.total_count >= p_min_count
  from counted;
$$;

grant execute on function public.civic_event_feedback_summary(text, text, integer)
  to anon, authenticated, service_role;

create or replace function public.civic_public_topic_summary(
  p_region text default '',
  p_topic text default '',
  p_min_count integer default 5
)
returns table (
  region_label text,
  topic_query text,
  total_count integer,
  support_count integer,
  oppose_count integer,
  unsure_count integer,
  average_urgency numeric,
  average_affectedness numeric,
  threshold_met boolean
)
language sql
security definer
set search_path = public
as $$
  with scoped as (
    select *
    from public.civic_user_feedback
    where public_anonymous = true
      and (
        nullif(trim(p_region), '') is null
        or region_label ilike '%' || trim(p_region) || '%'
      )
      and (
        nullif(trim(p_topic), '') is null
        or exists (
          select 1
          from unnest(topic_tags) as tag
          where tag ilike '%' || trim(p_topic) || '%'
        )
        or reason ilike '%' || trim(p_topic) || '%'
        or desired_outcome ilike '%' || trim(p_topic) || '%'
      )
  ),
  counted as (
    select
      coalesce(nullif(trim(p_region), ''), 'All regions') as region_label,
      coalesce(nullif(trim(p_topic), ''), 'All topics') as topic_query,
      count(*)::integer as total_count,
      count(*) filter (where position = 'support')::integer as support_count,
      count(*) filter (where position = 'oppose')::integer as oppose_count,
      count(*) filter (where position = 'unsure')::integer as unsure_count,
      round(avg(intensity)::numeric, 2) as average_urgency,
      round(avg(affectedness)::numeric, 2) as average_affectedness
    from scoped
  )
  select
    counted.region_label,
    counted.topic_query,
    case when counted.total_count >= p_min_count then counted.total_count else 0 end,
    case when counted.total_count >= p_min_count then counted.support_count else 0 end,
    case when counted.total_count >= p_min_count then counted.oppose_count else 0 end,
    case when counted.total_count >= p_min_count then counted.unsure_count else 0 end,
    case when counted.total_count >= p_min_count then counted.average_urgency else null end,
    case when counted.total_count >= p_min_count then counted.average_affectedness else null end,
    counted.total_count >= p_min_count
  from counted;
$$;

grant execute on function public.civic_public_topic_summary(text, text, integer)
  to anon, authenticated, service_role;

create or replace function public.record_civic_notification_interaction(
  p_notification_id uuid,
  p_state text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.civic_notifications
  set delivery_state = p_state,
      opened_at = case when p_state = 'opened' then now() else opened_at end
  where id = p_notification_id
    and user_id = auth.uid()
    and p_state in ('opened', 'dismissed', 'saved');
$$;

grant execute on function public.record_civic_notification_interaction(uuid, text)
  to authenticated, service_role;

grant select on public.civic_event_burden_scores
  to anon, authenticated;

grant all on public.civic_event_burden_scores
  to service_role;

grant all on public.civic_relevance_feedback
  to authenticated, service_role;
