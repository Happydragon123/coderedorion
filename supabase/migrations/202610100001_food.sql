begin;
create table public.profiles (id uuid primary key references auth.users on delete cascade, display_name text not null check(length(display_name) between 1 and 120), organization_name text check(length(organization_name)<=120));
create table public.locations (id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120), latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180));
create function public.food_tags_unique(tags text[]) returns boolean language sql immutable set search_path='' as $$ select cardinality(tags) = (select count(distinct value) from unnest(tags) value) $$;
create table public.listings (
 id uuid primary key default gen_random_uuid(), organizer_id uuid not null references public.profiles, location_id uuid not null references public.locations,
 title text not null check(length(btrim(title)) between 1 and 160), description text not null check(length(btrim(description)) between 1 and 4000), photo_path text check(length(photo_path) between 1 and 512),
 portions_total integer not null check(portions_total between 1 and 10000), pickup_instructions text not null check(length(btrim(pickup_instructions)) between 1 and 1000), pickup_deadline timestamptz not null,
 dietary_tags text[] not null default '{}' check(dietary_tags <@ array['vegetarian','vegan','halal','gluten_free']::text[] and cardinality(dietary_tags)<=4 and public.food_tags_unique(dietary_tags)), ingredients_notes text check(length(ingredients_notes)<=2000), allergen_notes text check(length(allergen_notes)<=2000), status text not null default 'open' check(status in ('open','closed')), created_at timestamptz not null default now()
);
create table public.reservations (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings, student_id uuid not null references public.profiles,
 pickup_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)), status text not null default 'reserved' check(status in ('reserved','collected','cancelled','expired')), created_at timestamptz not null default now(), collected_at timestamptz,
 unique(listing_id,pickup_code), check((status='collected')=(collected_at is not null))
);
create unique index reservations_one_claim on public.reservations(listing_id,student_id) where status in ('reserved','collected');
create index reservations_student on public.reservations(student_id,created_at);
create index listings_feed on public.listings(status,pickup_deadline);
create index listings_owner on public.listings(organizer_id,created_at);
create index listings_location on public.listings(location_id);
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.listings enable row level security;
alter table public.reservations enable row level security;
create policy profiles_self on public.profiles for select to authenticated using(id=auth.uid());
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy locations_read on public.locations for select to authenticated using(true);
create policy listings_read on public.listings for select to authenticated using(true);
create policy reservations_private on public.reservations for select to authenticated using(student_id=auth.uid() or exists(select 1 from public.listings l where l.id=listing_id and l.organizer_id=auth.uid()));
revoke all on public.profiles,public.locations,public.listings,public.reservations from anon,authenticated;
grant select on public.profiles,public.locations,public.listings,public.reservations to authenticated;
grant update(display_name,organization_name) on public.profiles to authenticated;
create function public.setup_food_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,display_name) values(new.id,'Campus member') on conflict do nothing; return new; end $$;
create trigger food_profile_signup after insert on auth.users for each row execute function public.setup_food_profile();
insert into public.profiles(id,display_name) select id,'Campus member' from auth.users on conflict do nothing;
create function public.food_commitments(target uuid) returns integer language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 return (select count(*)::integer from public.reservations r join public.listings l on l.id=r.listing_id where l.id=target and (r.status='collected' or (r.status='reserved' and l.pickup_deadline>statement_timestamp())));
end $$;
create view public.listing_availability with (security_invoker=true) as select l.*, jsonb_build_object('id',p.id,'name',p.name,'latitude',p.latitude,'longitude',p.longitude) as location, greatest(0,l.portions_total-public.food_commitments(l.id)) as available_portions from public.listings l join public.locations p on p.id=l.location_id;
create view public.private_reservations with (security_invoker=true) as select r.id,r.listing_id,r.student_id,r.pickup_code,case when r.status='reserved' and l.pickup_deadline<=statement_timestamp() then 'expired' else r.status end as status,r.created_at,r.collected_at from public.reservations r join public.listings l on l.id=r.listing_id;
revoke all on public.listing_availability,public.private_reservations from public,anon,authenticated;
grant select on public.listing_availability,public.private_reservations to authenticated;
create function public.check_food_photo(path text) returns void language plpgsql security definer set search_path='' as $$
begin
 if path is not null and (split_part(path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='food-photos' and name=path)) then raise check_violation using message='Invalid photo'; end if;
end $$;
create function public.create_food_listing(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.listings; begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 item:=jsonb_populate_record(null::public.listings,payload);
 if item.pickup_deadline<=clock_timestamp() then raise check_violation; end if;
 perform public.check_food_photo(item.photo_path);
 insert into public.listings(organizer_id,location_id,title,description,photo_path,portions_total,pickup_instructions,pickup_deadline,dietary_tags,ingredients_notes,allergen_notes)
 values(auth.uid(),item.location_id,item.title,item.description,item.photo_path,item.portions_total,item.pickup_instructions,item.pickup_deadline,item.dietary_tags,item.ingredients_notes,item.allergen_notes) returning id into item.id;
 return item.id;
end $$;
create function public.patch_food_listing(target uuid,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare old public.listings; item public.listings; begin
 select * into old from public.listings where id=target for update;
 if not found then raise no_data_found; end if;
 if auth.uid() is null or old.organizer_id<>auth.uid() then raise insufficient_privilege; end if;
 if payload - array['location_id','title','description','photo_path','portions_total','pickup_instructions','pickup_deadline','dietary_tags','ingredients_notes','allergen_notes','status'] <> '{}'::jsonb then raise check_violation; end if;
 item:=jsonb_populate_record(old,payload);
 if item.pickup_deadline is distinct from old.pickup_deadline and exists(select 1 from public.reservations where listing_id=target) then raise exception using errcode='P0001',message='Deadline locked'; end if;
 if item.portions_total<public.food_commitments(target) then raise exception using errcode='P0001',message='Committed inventory'; end if;
 perform public.check_food_photo(item.photo_path);
 update public.listings set location_id=item.location_id,title=item.title,description=item.description,photo_path=item.photo_path,portions_total=item.portions_total,pickup_instructions=item.pickup_instructions,pickup_deadline=item.pickup_deadline,dietary_tags=item.dietary_tags,ingredients_notes=item.ingredients_notes,allergen_notes=item.allergen_notes,status=item.status where id=target;
 return target;
end $$;
create function public.reserve_food(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.listings; r public.reservations; begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select * into l from public.listings where id=target for update;
 if not found then raise no_data_found; end if;
 if l.status<>'open' or l.pickup_deadline<=clock_timestamp() or l.portions_total<=public.food_commitments(target) then raise exception using errcode='P0001',message='Unavailable'; end if;
 insert into public.reservations(listing_id,student_id) values(target,auth.uid()) returning * into r; return to_jsonb(r);
end $$;
create function public.cancel_food(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare lid uuid; l public.listings; r public.reservations; begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select listing_id into lid from public.reservations where id=target;
 if not found then raise no_data_found; end if;
 select * into l from public.listings where id=lid for update;
 select * into r from public.reservations where id=target for update;
 if r.student_id<>auth.uid() then raise insufficient_privilege; end if;
 if r.status='cancelled' then return to_jsonb(r); end if;
 if r.status<>'reserved' then raise exception using errcode='P0001',message='Not reserved'; end if;
 update public.reservations set status=case when l.pickup_deadline<=clock_timestamp() then 'expired' else 'cancelled' end where id=target returning * into r;
 return to_jsonb(r);
end $$;
create function public.collect_food(target uuid,code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.listings; r public.reservations; begin
 select * into l from public.listings where id=target for update;
 if not found then raise no_data_found; end if;
 if auth.uid() is null or l.organizer_id<>auth.uid() then raise insufficient_privilege; end if;
 select * into r from public.reservations where listing_id=target and pickup_code=code for update;
 if not found then raise no_data_found; end if;
 if r.status='collected' then return to_jsonb(r); end if;
 if r.status<>'reserved' or l.pickup_deadline<=clock_timestamp() then raise exception using errcode='P0001',message='Cannot collect'; end if;
 update public.reservations set status='collected',collected_at=clock_timestamp() where id=r.id returning * into r; return to_jsonb(r);
end $$;
create function public.food_impact() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 return jsonb_build_object('posted_portions',coalesce((select sum(portions_total) from public.listings),0),'collected_portions',(select count(*) from public.reservations where status='collected'),'active_reserved_portions',(select count(*) from public.reservations r join public.listings l on l.id=r.listing_id where r.status='reserved' and l.pickup_deadline>statement_timestamp()));
end $$;
revoke all on function public.food_tags_unique(text[]),public.setup_food_profile(),public.check_food_photo(text),public.food_commitments(uuid),public.create_food_listing(jsonb),public.patch_food_listing(uuid,jsonb),public.reserve_food(uuid),public.cancel_food(uuid),public.collect_food(uuid,text),public.food_impact() from public,anon,authenticated;
grant execute on function public.food_commitments(uuid),public.create_food_listing(jsonb),public.patch_food_listing(uuid,jsonb),public.reserve_food(uuid),public.cancel_food(uuid),public.collect_food(uuid,text),public.food_impact() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('food-photos','food-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy food_photo_insert on storage.objects for insert to authenticated with check(bucket_id='food-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy food_photo_read on storage.objects for select to authenticated using(bucket_id='food-photos' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.listings where photo_path=name)));
commit;
