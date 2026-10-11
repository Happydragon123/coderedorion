import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Optional verification-only runtime; it is deliberately not an app dependency.
// Usage: node scripts/verify-required-photos.mjs PATH_TO_TEMP_PGLITE_INSTALL
// Uses in-memory PostgreSQL and a minimal Supabase auth/storage shim, never .env.
if (!process.argv[2]) throw new Error('Provide a temporary PGlite installation directory. See docs/required-photos.md.');
const { PGlite } = await import(pathToFileURL(join(resolve(process.argv[2]), 'node_modules/@electric-sql/pglite/dist/index.js')).href);
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,storage to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select string_to_array(name,'/') $$;
  `);
  await db.exec(await readFile('supabase/migrations/202610100001_food.sql', 'utf8'));
  // Establish genuine pre-migration history, not a timestamp-based exception.
  await db.exec(`
    insert into auth.users(id,email) values
      ('00000000-0000-4000-8000-000000000003','local-owner@example.invalid'),
      ('00000000-0000-4000-8000-000000000005','local-viewer@example.invalid');
    insert into public.locations(id,name,latitude,longitude) values
      ('00000000-0000-4000-8000-000000000001','LOCAL TEST ONLY',0,0);
    insert into public.listings(id,organizer_id,location_id,title,description,portions_total,pickup_instructions,pickup_deadline) values
      ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','LEGACY PHOTOLESS','Synthetic legacy history',1,'Test only',clock_timestamp()+interval '1 hour');
    insert into public.reservations(listing_id,student_id,pickup_code,status) values
      ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','LOCALONLY','cancelled');
  `);
  await db.exec(await readFile('supabase/migrations/20261011040000_required_listing_photos.sql', 'utf8'));
  await db.exec(await readFile('scripts/required-photos.local.sql', 'utf8'));
  console.log('PASS: isolated PostgreSQL required-photo RPC/insert/update enforcement and preserved legacy history.');
} catch (error) {
  console.error('Local SQL verification failed:', error.message, error.where || '');
  process.exitCode = 1;
} finally { await db.close(); }
