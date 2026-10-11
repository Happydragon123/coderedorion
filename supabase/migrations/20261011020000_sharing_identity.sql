begin;

-- Sharing names are user-chosen attribution, never authorization or verified
-- affiliation. Ignore malformed signup metadata instead of breaking signup.
create or replace function public.setup_food_profile()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  sharing_name text := 'Campus member';
  sharing_organization text := null;
  candidate text;
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'display_name') = 'string' then
    candidate := btrim(new.raw_user_meta_data ->> 'display_name', E' \t\n\r\f\013');
    if length(candidate) between 1 and 120 then sharing_name := candidate; end if;
  end if;
  if jsonb_typeof(new.raw_user_meta_data -> 'organization_name') = 'string' then
    candidate := btrim(new.raw_user_meta_data ->> 'organization_name', E' \t\n\r\f\013');
    if length(candidate) between 1 and 120 then sharing_organization := candidate; end if;
  end if;
  insert into public.profiles(id,display_name,organization_name)
  values(new.id,sharing_name,sharing_organization) on conflict do nothing;
  return new;
end $$;

-- Leave listing_availability's shape unchanged for older strict DTO readers.
-- Existing listing SELECT policy allows all authenticated users to read posts;
-- this separate RPC exposes only attribution for requested existing posts.
-- It does not make profiles enumerable, reveal email, or grant anonymous reads.
create function public.food_listing_sharers(targets uuid[])
returns table(listing_id uuid,display_name text,organization_name text)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if coalesce(cardinality(targets),0) > 1000 or coalesce(array_ndims(targets),1) > 1 then
    raise invalid_parameter_value using message='Request at most 1000 listing IDs.';
  end if;
  return query
    select l.id,p.display_name,p.organization_name
    from public.listings l join public.profiles p on p.id=l.organizer_id
    where l.id=any(targets);
end $$;

revoke all on function public.setup_food_profile() from public,anon,authenticated;
revoke all on function public.food_listing_sharers(uuid[]) from public,anon,authenticated;
grant execute on function public.food_listing_sharers(uuid[]) to authenticated;

comment on function public.food_listing_sharers(uuid[]) is
  'Authenticated-only user-chosen sharing attribution for requested food listings. No email, auth metadata or reservations. Re-review if listing visibility changes.';

commit;
