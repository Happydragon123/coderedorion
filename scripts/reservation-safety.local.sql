-- LOCAL throwaway PostgreSQL/Supabase only, after all food migrations.
-- All test users, synthetic coordinates, posts and claims roll back.
begin;
create temporary table reservation_safety_ids(
  organizer uuid, student uuid, other_student uuid, location uuid,
  listing uuid, expiry_listing uuid, cancelled_claim uuid, active_claim uuid
);
insert into reservation_safety_ids(organizer,student,other_student,location)
values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on reservation_safety_ids to authenticated;

do $$
declare ids record; payload jsonb; test_listing_id uuid; expiry_id uuid; closed_id uuid;
  first_claim jsonb; new_active_claim jsonb; other_claim jsonb; collected jsonb; retry jsonb;
  impact_before jsonb; impact_after jsonb; forbidden_message text;
begin
  select * into ids from reservation_safety_ids;
  insert into auth.users(id,email,raw_user_meta_data) values
    (ids.organizer,'reserve-organizer@example.invalid','{"display_name":"Test organizer"}'::jsonb),
    (ids.student,'reserve-student@example.invalid','{"display_name":"Test student"}'::jsonb),
    (ids.other_student,'reserve-other@example.invalid','{"display_name":"Other student"}'::jsonb);
  insert into public.locations(id,name,latitude,longitude) values(ids.location,'LOCAL ROLLBACK RESERVATION TEST',0,0);
  assert has_function_privilege('authenticated','public.reserve_food(uuid)','EXECUTE');
  assert not has_function_privilege('anon','public.reserve_food(uuid)','EXECUTE');
  assert (select proconfig @> array['search_path=""'] from pg_proc where oid='public.reserve_food(uuid)'::regprocedure);
  payload:=jsonb_build_object('location_id',ids.location,'title','LOCAL ROLLBACK TEST','description','Not actual food',
    'photo_path',null,'portions_total',2,'pickup_instructions','Test only','pickup_deadline',statement_timestamp()+interval '1 hour',
    'dietary_tags','[]'::jsonb,'ingredients_notes',null,'allergen_notes',null);
  perform set_config('request.jwt.claim.sub',ids.organizer::text,true);
  test_listing_id:=public.create_food_listing(payload);
  expiry_id:=public.create_food_listing(payload || '{"portions_total":1}'::jsonb);
  closed_id:=public.create_food_listing(payload);
  begin
    perform public.reserve_food(test_listing_id);
    raise exception using errcode='XX000',message='Self reservation succeeded';
  exception when insufficient_privilege then
    get stacked diagnostics forbidden_message=message_text;
    assert forbidden_message='Cannot reserve your own food.';
  end;
  assert not exists(select 1 from public.reservations r where r.listing_id=test_listing_id);
  perform set_config('request.jwt.claim.sub','',true);
  begin perform public.reserve_food(test_listing_id); raise exception using errcode='XX000',message='Anonymous reserved'; exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub',ids.student::text,true);
  first_claim:=public.reserve_food(test_listing_id);
  assert first_claim->>'student_id'=ids.student::text;
  begin perform public.reserve_food(test_listing_id); raise exception using errcode='XX000',message='Duplicate claim succeeded'; exception when unique_violation then null; end;
  perform set_config('request.jwt.claim.sub',ids.other_student::text,true);
  other_claim:=public.reserve_food(test_listing_id);
  begin perform public.reserve_food(test_listing_id); raise exception using errcode='XX000',message='Sold-out claim succeeded'; exception when sqlstate 'P0001' then null; end;
  begin perform public.cancel_food((first_claim->>'id')::uuid); raise exception using errcode='XX000',message='Cancelled someone else claim'; exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub',ids.student::text,true);
  assert public.cancel_food((first_claim->>'id')::uuid)->>'status'='cancelled';
  assert public.cancel_food((first_claim->>'id')::uuid)->>'status'='cancelled';
  new_active_claim:=public.reserve_food(test_listing_id);
  assert new_active_claim->>'id'<>first_claim->>'id';
  perform set_config('request.jwt.claim.sub',ids.organizer::text,true);
  begin perform public.patch_food_listing(test_listing_id,'{"portions_total":1}'::jsonb); raise exception using errcode='XX000',message='Reduced committed portions'; exception when sqlstate 'P0001' then null; end;
  begin perform public.patch_food_listing(test_listing_id,jsonb_build_object('pickup_deadline',statement_timestamp()+interval '2 hours')); raise exception using errcode='XX000',message='Changed committed deadline'; exception when sqlstate 'P0001' then null; end;
  perform public.patch_food_listing(test_listing_id,'{"status":"closed"}'::jsonb);
  perform public.patch_food_listing(closed_id,'{"status":"closed"}'::jsonb);
  perform set_config('request.jwt.claim.sub',ids.student::text,true);
  begin perform public.reserve_food(closed_id); raise exception using errcode='XX000',message='Closed post reserved'; exception when sqlstate 'P0001' then null; end;
  begin perform public.collect_food(test_listing_id,new_active_claim->>'pickup_code'); raise exception using errcode='XX000',message='Nonowner collected'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',ids.organizer::text,true);
  impact_before:=public.food_impact();
  collected:=public.collect_food(test_listing_id,new_active_claim->>'pickup_code');
  retry:=public.collect_food(test_listing_id,new_active_claim->>'pickup_code');
  impact_after:=public.food_impact();
  assert collected->>'status'='collected';
  assert retry->>'collected_at'=collected->>'collected_at';
  assert (impact_after->>'collected_portions')::int=(impact_before->>'collected_portions')::int+1;

  perform set_config('request.jwt.claim.sub',ids.student::text,true);
  first_claim:=public.reserve_food(expiry_id);
  -- Simulate passage of time using the database owner, never a production write.
  update public.listings set pickup_deadline=statement_timestamp()-interval '1 second' where id=expiry_id;
  assert (select status='expired' from public.private_reservations where id=(first_claim->>'id')::uuid);
  begin perform public.reserve_food(expiry_id); raise exception using errcode='XX000',message='Expired post reserved'; exception when sqlstate 'P0001' then null; end;
  perform set_config('request.jwt.claim.sub',ids.organizer::text,true);
  begin perform public.collect_food(expiry_id,first_claim->>'pickup_code'); raise exception using errcode='XX000',message='Expired post collected'; exception when sqlstate 'P0001' then null; end;
  perform set_config('request.jwt.claim.sub',ids.student::text,true);
  assert public.cancel_food((first_claim->>'id')::uuid)->>'status'='expired';
  update reservation_safety_ids set listing=test_listing_id,expiry_listing=expiry_id,
    cancelled_claim=(select r.id from public.reservations r where r.listing_id=test_listing_id and r.status='cancelled' limit 1),
    active_claim=(new_active_claim->>'id')::uuid;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',(select student::text from reservation_safety_ids),true);
do $$
declare ids record; selected_claim uuid;
begin
  select * into ids from reservation_safety_ids;
  assert not exists(select 1 from public.private_reservations where student_id=ids.other_student);
  -- Context reads explicitly scope to caller even when organizer RLS can see others.
  select id into selected_claim from public.private_reservations
  where listing_id=ids.listing and student_id=auth.uid() and status in ('reserved','collected')
  order by created_at desc,id desc limit 1;
  assert selected_claim=ids.active_claim;
  assert (select pickup_code is not null from public.private_reservations where id=selected_claim);
  assert (select status='cancelled' from public.private_reservations where id=ids.cancelled_claim);
  raise notice 'PASS: self/anonymous denial, other-student reservations, duplicate/sold-out checks, private context, cancellation/re-reserve, committed edits, closed/expired behavior and exactly-once collection';
end $$;
select set_config('request.jwt.claim.sub',(select organizer::text from reservation_safety_ids),true);
do $$
declare ids record;
begin
  select * into ids from reservation_safety_ids;
  assert exists(select 1 from public.private_reservations where listing_id=ids.listing);
  assert not exists(select 1 from public.private_reservations where listing_id=ids.listing and student_id=auth.uid());
end $$;
reset role;
rollback;
