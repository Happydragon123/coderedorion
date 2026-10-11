import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Optional verification-only runtime; it is deliberately not an app dependency.
// Usage: node scripts/verify-sharing-identity.mjs PATH_TO_TEMP_PGLITE_INSTALL
// Uses in-memory PostgreSQL and a minimal Supabase auth/storage shim, never .env.
if (!process.argv[2]) throw new Error('Provide a temporary PGlite installation directory. See docs/account-profiles.md.');
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
  for (const file of ['supabase/migrations/202610100001_food.sql', 'supabase/migrations/20261011012419_location_google_maps_url.sql', 'supabase/migrations/20261011020000_sharing_identity.sql', 'scripts/sharing-identity.local.sql']) {
    await db.exec(await readFile(file, 'utf8'));
  }
  console.log('PASS: local PostgreSQL migration, signup metadata, listing attribution, own-profile edits, RLS, email privacy and RPC grants/bounds. All test records rolled back.');
} finally { await db.close(); }
