-- Run ONLY in a throwaway LOCAL PostgreSQL/Supabase database after all migrations.
-- Never run against the hosted food project. All test records roll back.
-- Needs the migration owner and Supabase auth schema/roles (or equivalent shim).
begin;

create temporary table sharing_identity_test_ids as select
  gen_random_uuid() as organizer, gen_random_uuid() as viewer,
  gen_random_uuid() as malformed_user, gen_random_uuid() as location,
  gen_random_uuid() as listing;
grant select on sharing_identity_test_ids to authenticated;

do $$
declare ids record; attribution jsonb;
begin
  select * into ids from sharing_identity_test_ids;
  insert into auth.users(id,email,raw_user_meta_data) values
    (ids.organizer,'identity-organizer@example.invalid','{"display_name":"  Test sharer  ","organization_name":"  Test organization  "}'::jsonb),
    (ids.viewer,'identity-viewer@example.invalid','{"display_name":"Test viewer","organization_name":"   "}'::jsonb),
    (ids.malformed_user,'identity-malformed@example.invalid',jsonb_build_object('display_name',repeat('x',121),'organization_name',jsonb_build_object('role','admin')));
  assert (select display_name='Test sharer' and organization_name='Test organization' from public.profiles where id=ids.organizer);
  assert (select organization_name is null from public.profiles where id=ids.viewer);
  assert (select display_name='Campus member' and organization_name is null from public.profiles where id=ids.malformed_user);

  -- Synthetic coordinates are local test inputs, not campus seed data.
  insert into public.locations(id,name,latitude,longitude) values(ids.location,'LOCAL ROLLBACK TEST',0,0);
  insert into public.listings(id,organizer_id,location_id,title,description,portions_total,pickup_instructions,pickup_deadline)
  values(ids.listing,ids.organizer,ids.location,'LOCAL ROLLBACK TEST','Not actual food',1,'Test only',statement_timestamp()+interval '1 hour');

  assert has_function_privilege('authenticated','public.food_listing_sharers(uuid[])','EXECUTE');
  assert not has_function_privilege('anon','public.food_listing_sharers(uuid[])','EXECUTE');
  assert not has_function_privilege('authenticated','public.setup_food_profile()','EXECUTE');
  assert not has_function_privilege('anon','public.setup_food_profile()','EXECUTE');
  assert not has_table_privilege('anon','public.profiles','SELECT');
  assert not has_column_privilege('authenticated','auth.users','email','SELECT');
  assert (select reloptions @> array['security_invoker=true'] from pg_class where oid='public.listing_availability'::regclass);
  assert not exists(select 1 from information_schema.columns where table_schema='public' and table_name='listing_availability' and column_name='sharer');

  -- Even the function owner cannot invoke it without an authenticated identity.
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.food_listing_sharers(array[ids.listing]);
    raise exception 'Anonymous identity read succeeded';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',(select viewer::text from sharing_identity_test_ids),true);
do $$
declare ids record; attribution jsonb; changed integer;
begin
  select * into ids from sharing_identity_test_ids;
  assert (select count(*) from public.profiles)=1;
  assert (select id=ids.viewer from public.profiles);
  update public.profiles set display_name='Edited viewer',organization_name='Updated organization' where id=ids.viewer;
  get diagnostics changed=row_count; assert changed=1;
  update public.profiles set display_name='Unauthorized edit' where id=ids.organizer;
  get diagnostics changed=row_count; assert changed=0;

  select to_jsonb(s) into attribution from public.food_listing_sharers(array[ids.listing]) s;
  assert attribution=jsonb_build_object('listing_id',ids.listing,'display_name','Test sharer','organization_name','Test organization');
  assert not exists(select 1 from public.food_listing_sharers(array[ids.organizer]));
  assert not exists(select 1 from public.food_listing_sharers(array[]::uuid[]));
  assert not exists(select 1 from public.food_listing_sharers(null::uuid[]));
  assert (select count(*) from public.food_listing_sharers(array[ids.listing,ids.listing]))=1;
  begin
    perform public.food_listing_sharers(array_fill(ids.listing,array[1001]));
    raise exception 'Unbounded identity read succeeded';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.food_listing_sharers(array[[ids.listing]]);
    raise exception 'Multidimensional identity read succeeded';
  exception when invalid_parameter_value then null; end;
  begin
    perform email from auth.users where id=ids.organizer;
    raise exception 'Private email read succeeded';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: signup attribution, authenticated listing-only names, private email/profile RLS, own edits, bounded RPC and unchanged availability view';
end $$;
reset role;
rollback;
