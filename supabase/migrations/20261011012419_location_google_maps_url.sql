begin;

-- Administrator-maintained, verified Google Maps Share links only.
-- Null keeps existing landmarks and coordinate-based directions compatible.
alter table public.locations add column google_maps_url text;
alter table public.locations add constraint locations_google_maps_url_check check (
  google_maps_url is null or (
    octet_length(google_maps_url) between 1 and 2048
    and google_maps_url !~ '[[:space:][:cntrl:]\\]'
    and google_maps_url !~ '[   -     　﻿]'
    and google_maps_url !~* '%(0[0-9a-f]|1[0-9a-f]|7f)'
    and split_part(split_part(google_maps_url,'?',1),'#',1) !~* '/(\.|%2e)(\.|%2e)?(/|$)'
    and google_maps_url ~ '^https://(maps\.app\.goo\.gl/[^?#]+([?#].*)?|maps\.google\.com([/?#].*)?|goo\.gl/maps([/?#].*)?|(www\.)?google\.com/maps([/?#].*)?)$'
  )
);

-- Preserve the invoker view, count-only commitments, and existing grants.
create or replace view public.listing_availability with (security_invoker=true) as
select l.*,
  jsonb_build_object('id',p.id,'name',p.name,'latitude',p.latitude,'longitude',p.longitude,'google_maps_url',p.google_maps_url) as location,
  greatest(0,l.portions_total-public.food_commitments(l.id)) as available_portions
from public.listings l join public.locations p on p.id=l.location_id;

comment on column public.locations.google_maps_url is
  'Optional administrator-verified HTTPS Google Maps Share link for the pickup landmark. No client write grants.';
commit;
