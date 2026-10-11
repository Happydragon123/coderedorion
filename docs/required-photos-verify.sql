-- Administrative READ ONLY verification after applying the required-photo migration.
select exists (
 select 1 from pg_trigger
 where tgrelid='public.listings'::regclass and tgname='food_listing_required_photo'
 and not tgisinternal and tgenabled='O'
 and tgfoid='public.enforce_food_listing_photo()'::regprocedure
) as required_photo_trigger_enabled;
select p.prosecdef as security_definer, p.proconfig as fixed_search_path,
 not has_function_privilege('anon',p.oid,'execute') as anonymous_trigger_execution_denied,
 not has_function_privilege('authenticated',p.oid,'execute') as client_trigger_execution_denied,
 pg_get_functiondef(p.oid) as installed_definition
from pg_proc p where p.oid='public.enforce_food_listing_photo()'::regprocedure;
select
 not has_table_privilege('authenticated','public.listings','insert') as client_insert_denied,
 not has_table_privilege('authenticated','public.listings','update') as client_update_denied,
 not has_function_privilege('anon','public.create_food_listing(jsonb)','execute') as anonymous_creation_denied,
 has_function_privilege('authenticated','public.create_food_listing(jsonb)','execute') as authenticated_creation_available;
select not public as private_bucket from storage.buckets where id='food-photos';
select count(*) as historical_photo_less_listings from public.listings where photo_path is null;
