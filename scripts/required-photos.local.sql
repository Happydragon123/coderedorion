-- ONLY a throwaway local PostgreSQL database with auth/storage shim.
-- Executed by verify-required-photos.mjs; all records roll back.
begin;
do $$
declare
 owner_id uuid := '00000000-0000-4000-8000-000000000003';
 foreign_id uuid := '00000000-0000-4000-8000-000000000005';
 location_id uuid := '00000000-0000-4000-8000-000000000001';
 path text := owner_id::text || '/00000000-0000-4000-8000-000000000006.webp';
 foreign_path text := foreign_id::text || '/00000000-0000-4000-8000-000000000006.webp';
 input jsonb; candidate jsonb; created uuid; invalid_path text; legacy public.listings;
begin
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 insert into storage.objects(bucket_id,name) values('food-photos',path),('food-photos',foreign_path);
 input := jsonb_build_object('location_id',location_id,'title','LOCAL PHOTO TEST','description','Synthetic; no food offered',
  'portions_total',1,'pickup_instructions','Test only','pickup_deadline',clock_timestamp()+interval '1 hour',
  'dietary_tags','[]'::jsonb,'ingredients_notes',null,'allergen_notes',null);
 -- Direct RPC: missing/null/empty/malformed/nonexistent/foreign all fail.
 for candidate in select input union all select input || jsonb_build_object('photo_path',p)
  from unnest(array[null,'',' ','bad',owner_id::text || '/00000000-0000-4000-8000-000000000099.webp',foreign_path]) p
 loop
  begin
   perform public.create_food_listing(candidate);
   raise exception 'Invalid RPC attachment accepted';
  exception when check_violation then null; end;
 end loop;
 -- The insertion trigger also covers paths that bypass the creation RPC.
 foreach invalid_path in array array[null,'','bad',owner_id::text || '/00000000-0000-4000-8000-000000000099.webp',foreign_path] loop
  begin
   insert into public.listings(organizer_id,location_id,title,description,photo_path,portions_total,pickup_instructions,pickup_deadline)
   values(owner_id,location_id,'LOCAL INSERT TEST','No food offered',invalid_path,1,'Test only',clock_timestamp()+interval '1 hour');
   raise exception 'Invalid direct insertion accepted';
  exception when check_violation then null; end;
 end loop;
 created := public.create_food_listing(input || jsonb_build_object('photo_path',path));
 assert (select photo_path=path from public.listings where id=created);
 begin
  perform public.patch_food_listing(created,'{"photo_path":null}'::jsonb);
  raise exception 'RPC removed required photo';
 exception when check_violation then null; end;
 begin
  update public.listings set photo_path=null where id=created;
  raise exception 'Direct update removed required photo';
 exception when check_violation then null; end;
 begin
  update public.listings set photo_path=foreign_path where id=created;
  raise exception 'Direct update accepted foreign photo';
 exception when check_violation then null; end;
 -- Legacy row was inserted before the additive migration; close/edit remains usable.
 select * into legacy from public.listings where title='LEGACY PHOTOLESS';
 assert legacy.photo_path is null;
 perform public.patch_food_listing(legacy.id,'{"title":"Legacy edited","status":"closed","photo_path":null}'::jsonb);
 assert (select photo_path is null and status='closed' and title='Legacy edited' from public.listings where id=legacy.id);
 assert (select count(*) from public.reservations where listing_id=legacy.id)=1;
 assert (select count(*) from public.listing_availability where id=legacy.id)=1;
 perform public.patch_food_listing(legacy.id,jsonb_build_object('photo_path',path));
 begin
  perform public.patch_food_listing(legacy.id,'{"photo_path":null}'::jsonb);
  raise exception 'Legacy attachment was removed after adoption';
 exception when check_violation then null; end;
 perform set_config('request.jwt.claim.sub','',true);
 begin
  perform public.create_food_listing(input || jsonb_build_object('photo_path',path));
  raise exception 'Anonymous creation accepted';
 exception when insufficient_privilege then null; end;
 assert not has_function_privilege('anon','public.create_food_listing(jsonb)','execute');
 assert not has_function_privilege('authenticated','public.enforce_food_listing_photo()','execute');
 assert not has_table_privilege('authenticated','public.listings','insert');
 assert not has_table_privilege('authenticated','public.listings','update');
 assert (select not public from storage.buckets where id='food-photos');
end $$;
rollback;
