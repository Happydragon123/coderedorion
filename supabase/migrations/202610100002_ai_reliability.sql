begin;

-- Runtime limits are administrator controlled, never accepted from API callers.
create table public.ai_runtime_config (
  singleton boolean primary key default true check (singleton),
  user_per_minute integer not null default 6 check (user_per_minute between 1 and 60),
  project_per_minute integer not null default 12 check (project_per_minute between 1 and 1000),
  user_per_day integer not null default 100 check (user_per_day between 1 and 10000),
  project_per_day integer not null default 450 check (project_per_day between 1 and 100000),
  user_concurrency integer not null default 1 check (user_concurrency between 1 and 10),
  project_concurrency integer not null default 2 check (project_concurrency between 1 and 100),
  lease_seconds integer not null default 60 check (lease_seconds between 50 and 300),
  provider_cooldown_seconds integer not null default 3600 check (provider_cooldown_seconds between 1 and 86400),
  cache_ttl_seconds integer not null default 300 check (cache_ttl_seconds between 1 and 3600),
  cache_max_entries integer not null default 1000 check (cache_max_entries between 1 and 10000)
);
insert into public.ai_runtime_config default values;
create table public.ai_admissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  admitted_at timestamptz not null,
  expires_at timestamptz not null,
  released boolean not null default false
);
create index ai_admissions_time on public.ai_admissions(admitted_at);
create index ai_admissions_user_time on public.ai_admissions(user_id, admitted_at);
create table public.ai_provider_state (
  singleton boolean primary key default true check (singleton),
  cooldown_until timestamptz not null default '-infinity'
);
insert into public.ai_provider_state default values;
create table public.ai_interpretations (
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null check (cache_key ~ '^[a-f0-9]{64}$'),
  token uuid not null default gen_random_uuid(),
  filters jsonb,
  expires_at timestamptz not null,
  primary key(user_id, cache_key),
  check (filters is null or (jsonb_typeof(filters) = 'object' and octet_length(filters::text) <= 4096))
);
create index ai_interpretations_expiry on public.ai_interpretations(expires_at);

alter table public.ai_runtime_config enable row level security;
alter table public.ai_admissions enable row level security;
alter table public.ai_provider_state enable row level security;
alter table public.ai_interpretations enable row level security;
revoke all on public.ai_runtime_config, public.ai_admissions, public.ai_provider_state, public.ai_interpretations from public, anon, authenticated;

create function public.ai_admit() returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); t timestamptz; c public.ai_runtime_config; n integer; until_at timestamptz; lease uuid;
begin
  if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(710031001);
  t := clock_timestamp();
  select * into strict c from public.ai_runtime_config;
  delete from public.ai_admissions where admitted_at < (date_trunc('day', t at time zone 'UTC') at time zone 'UTC') and admitted_at<=t-interval '60 seconds' and (released or expires_at<=t);
  select cooldown_until into until_at from public.ai_provider_state;
  if until_at > t then return jsonb_build_object('allowed',false,'retry_after_seconds',ceil(extract(epoch from until_at-t))::integer,'reason','provider_cooldown'); end if;
  select count(*), min(expires_at) into n, until_at from public.ai_admissions where user_id=u and not released and expires_at>t;
  if n >= c.user_concurrency then return jsonb_build_object('allowed',false,'retry_after_seconds',greatest(1,ceil(extract(epoch from until_at-t))::integer),'reason','user_concurrency'); end if;
  select count(*), min(expires_at) into n, until_at from public.ai_admissions where not released and expires_at>t;
  if n >= c.project_concurrency then return jsonb_build_object('allowed',false,'retry_after_seconds',greatest(1,ceil(extract(epoch from until_at-t))::integer),'reason','project_concurrency'); end if;
  select count(*), min(admitted_at)+interval '60 seconds' into n, until_at from public.ai_admissions where user_id=u and admitted_at>t-interval '60 seconds';
  if n >= c.user_per_minute then return jsonb_build_object('allowed',false,'retry_after_seconds',greatest(1,ceil(extract(epoch from until_at-t))::integer),'reason','user_budget'); end if;
  select count(*), min(admitted_at)+interval '60 seconds' into n, until_at from public.ai_admissions where admitted_at>t-interval '60 seconds';
  if n >= c.project_per_minute then return jsonb_build_object('allowed',false,'retry_after_seconds',greatest(1,ceil(extract(epoch from until_at-t))::integer),'reason','project_budget'); end if;
  select count(*) into n from public.ai_admissions where user_id=u and admitted_at >= (date_trunc('day',t at time zone 'UTC') at time zone 'UTC');
  if n >= c.user_per_day then return jsonb_build_object('allowed',false,'retry_after_seconds',ceil(extract(epoch from ((date_trunc('day',t at time zone 'UTC')+interval '1 day') at time zone 'UTC')-t))::integer,'reason','user_daily_budget'); end if;
  select count(*) into n from public.ai_admissions where admitted_at >= (date_trunc('day',t at time zone 'UTC') at time zone 'UTC');
  if n >= c.project_per_day then return jsonb_build_object('allowed',false,'retry_after_seconds',ceil(extract(epoch from ((date_trunc('day',t at time zone 'UTC')+interval '1 day') at time zone 'UTC')-t))::integer,'reason','daily_budget'); end if;
  insert into public.ai_admissions(user_id,admitted_at,expires_at) values(u,t,t+make_interval(secs=>c.lease_seconds)) returning id into lease;
  return jsonb_build_object('allowed',true,'lease_id',lease,'retry_after_seconds',0);
end $$;

create function public.ai_release(p_lease_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.ai_admissions set released=true where id=p_lease_id and user_id=auth.uid();
end $$;

create function public.ai_provider_cooldown(p_lease_id uuid) returns integer language plpgsql security definer set search_path = '' as $$
declare t timestamptz; until_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(710031001);
  t := clock_timestamp();
  if not exists(select 1 from public.ai_admissions where id=p_lease_id and user_id=auth.uid() and not released and expires_at>t) then raise exception 'Active owned lease required' using errcode='42501'; end if;
  update public.ai_provider_state set cooldown_until=greatest(cooldown_until,t+make_interval(secs=>(select provider_cooldown_seconds from public.ai_runtime_config))) returning cooldown_until into until_at;
  return greatest(1,ceil(extract(epoch from until_at-t))::integer);
end $$;

create function public.ai_cache_claim(p_cache_key text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); t timestamptz; r public.ai_interpretations; cap integer; tok uuid;
begin
  if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_cache_key is null or p_cache_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid cache key' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(710031002);
  t := clock_timestamp();
  delete from public.ai_interpretations where expires_at<=t;
  select * into r from public.ai_interpretations where user_id=u and cache_key=p_cache_key;
  if found then
    if r.filters is not null then return jsonb_build_object('status','hit','filters',r.filters); end if;
    return jsonb_build_object('status','pending','retry_after_seconds',greatest(1,ceil(extract(epoch from r.expires_at-t))::integer));
  end if;
  select cache_max_entries into cap from public.ai_runtime_config;
  -- Never evict an in-flight claim: bounded contention returns busy.
  if (select count(*) from public.ai_interpretations)>=cap then
    delete from public.ai_interpretations where (user_id,cache_key) in (select user_id,cache_key from public.ai_interpretations where filters is not null order by expires_at limit 1);
    if (select count(*) from public.ai_interpretations)>=cap then return jsonb_build_object('status','pending','retry_after_seconds',1); end if;
  end if;
  insert into public.ai_interpretations(user_id,cache_key,expires_at) values(u,p_cache_key,t+interval '60 seconds') returning token into tok;
  return jsonb_build_object('status','claimed','claim_id',tok);
end $$;

create function public.ai_cache_complete(p_cache_key text,p_claim_id uuid,p_filters jsonb) returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_filters is null or jsonb_typeof(p_filters)<>'object' or octet_length(p_filters::text)>4096 or exists(select 1 from jsonb_object_keys(p_filters) k where k not in ('location_id','dietary_tag','origin_lat','origin_lng','max_distance_m')) then raise exception 'Invalid filters' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(710031002);
  update public.ai_interpretations set filters=p_filters,expires_at=clock_timestamp()+make_interval(secs=>(select cache_ttl_seconds from public.ai_runtime_config)) where user_id=auth.uid() and cache_key=p_cache_key and token=p_claim_id and filters is null and expires_at>clock_timestamp();
  get diagnostics changed=row_count;
  return changed=1;
end $$;

create function public.ai_cache_abandon(p_cache_key text,p_claim_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(710031002);
  delete from public.ai_interpretations where user_id=auth.uid() and cache_key=p_cache_key and token=p_claim_id and filters is null;
end $$;

revoke all on function public.ai_admit(), public.ai_release(uuid), public.ai_provider_cooldown(uuid), public.ai_cache_claim(text), public.ai_cache_complete(text,uuid,jsonb), public.ai_cache_abandon(text,uuid) from public, anon;
grant execute on function public.ai_admit(), public.ai_release(uuid), public.ai_provider_cooldown(uuid), public.ai_cache_claim(text), public.ai_cache_complete(text,uuid,jsonb), public.ai_cache_abandon(text,uuid) to authenticated;
commit;
