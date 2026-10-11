begin;
-- No backfill/NOT NULL: historical photo-less listings remain valid.
-- Trigger covers RPCs and privileged insertion paths without trusting created_at.
create function public.enforce_food_listing_photo() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP = 'INSERT' or new.photo_path is distinct from old.photo_path then
  if new.photo_path is null then
   if TG_OP = 'INSERT' or old.photo_path is not null then
    raise check_violation using message='A food photo is required.';
   end if;
  else
   if auth.uid() is null or new.organizer_id <> auth.uid() then raise insufficient_privilege; end if;
   if new.photo_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpg|jpeg)$' then
    raise check_violation using message='Invalid photo';
   end if;
   perform public.check_food_photo(new.photo_path);
  end if;
 end if;
 -- A privileged path must not transfer an existing attachment to another owner.
 if TG_OP = 'UPDATE' and new.organizer_id is distinct from old.organizer_id then
  raise insufficient_privilege;
 end if;
 return new;
end $$;
revoke all on function public.enforce_food_listing_photo() from public,anon,authenticated;
create trigger food_listing_required_photo before insert or update on public.listings
for each row execute function public.enforce_food_listing_photo();
commit;
