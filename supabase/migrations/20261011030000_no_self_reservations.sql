begin;

-- Preserve listing-first serialization, lifecycle checks and private code output.
-- Ownership is checked inside the locked transaction, not only in the UI/API.
create or replace function public.reserve_food(target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.listings; r public.reservations;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select * into l from public.listings where id=target for update;
  if not found then raise no_data_found; end if;
  if l.organizer_id=auth.uid() then
    raise insufficient_privilege using message='Cannot reserve your own food.';
  end if;
  if l.status<>'open' or l.pickup_deadline<=clock_timestamp() or l.portions_total<=public.food_commitments(target) then
    raise exception using errcode='P0001',message='Unavailable';
  end if;
  insert into public.reservations(listing_id,student_id) values(target,auth.uid()) returning * into r;
  return to_jsonb(r);
end $$;

revoke all on function public.reserve_food(uuid) from public,anon,authenticated;
grant execute on function public.reserve_food(uuid) to authenticated;
comment on function public.reserve_food(uuid) is
  'Atomic authenticated claim of one portion. Listing-first lock; the listing organizer cannot claim their own food.';
commit;
