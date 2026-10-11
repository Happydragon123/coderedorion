import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createListingSchema, draftSchema, listingDetailsSchema, listingRowSchema, listingSchema, patchListingSchema } from '../lib/contracts';
import { demoListing } from '../lib/fixtures';
import { PhotoAttachment } from '../components/organizer/photo-attachment';
const path = `${demoListing.organizer_id}/00000000-0000-4000-8000-000000000006.webp`;
const details = listingDetailsSchema.parse(Object.fromEntries(Object.keys(listingDetailsSchema.shape).map(key => [key, demoListing[key as keyof typeof demoListing]])));
const file = () => new File(['test transport only'], 'food.png', { type: 'image/png' });

test('creation requires a nonempty well-formed attachment; historical reads, drafts and PATCH stay nullable', () => {
  for (const photo_path of [undefined, null, '', ' ', 'not-a-path', '../food.webp', `${demoListing.organizer_id}/../food.webp`, 'https://example.test/photo.webp']) {
    assert.equal(createListingSchema.safeParse({ ...details, photo_path }).success, false);
  }
  assert.equal(createListingSchema.safeParse({ ...details, photo_path: path }).success, true);
  assert.equal(listingSchema.safeParse(demoListing).success, true);
  const row = Object.fromEntries(Object.entries(demoListing).filter(([key]) => !['location', 'available_portions'].includes(key)));
  assert.equal(listingRowSchema.safeParse(row).success, true);
  assert.equal(draftSchema.safeParse(Object.fromEntries(Object.keys(draftSchema.shape).map(key => [key, null]))).success, true);
  assert.equal(patchListingSchema.safeParse({ title: 'Legacy edit' }).success, true);
  assert.equal(patchListingSchema.safeParse({ photo_path: null, status: 'closed' }).success, true);
});

test('missing, empty or invalid selected file cannot upload or create', async () => {
  const photo = new PhotoAttachment();
  for (const selected of [undefined, new File([], 'empty.png', { type: 'image/png' }), new File(['text'], 'bad.txt', { type: 'text/plain' })]) {
    photo.select(selected);
    await assert.rejects(photo.publish(details, { upload: async () => assert.fail('upload called'), create: async () => assert.fail('create called'), stage: () => {} }));
  }
});

test('failed upload retains selection, creates nothing, and explicit retry awaits confirmed upload', async () => {
  const photo = new PhotoAttachment(); const selected = file(); photo.select(selected);
  let uploads = 0, creates = 0;
  let complete!: (value: unknown) => void;
  const actions = { upload: async () => { uploads++; if (uploads === 1) throw new Error('Storage unavailable'); return new Promise(resolve => { complete = resolve; }); }, create: async (body: unknown) => { creates++; assert.equal(createListingSchema.parse(body).photo_path, path); return { listing: demoListing }; }, stage: () => {} };
  await assert.rejects(photo.publish(details, actions), /Storage unavailable/);
  assert.equal(photo.file, selected); assert.equal(photo.path, null); assert.equal(creates, 0);
  const retry = photo.publish(details, actions);
  await Promise.resolve(); assert.equal(creates, 0);
  complete({ photo_path: path }); await retry;
  assert.equal(creates, 1); assert.equal(uploads, 2);
});

test('failed publish reuses successful upload; selecting a replacement invalidates it', async () => {
  const photo = new PhotoAttachment(); photo.select(file());
  let uploads = 0, creates = 0;
  const actions = { upload: async () => { uploads++; return { photo_path: path }; }, create: async () => { creates++; if (creates === 1) throw new Error('Publish failed'); return { listing: demoListing }; }, stage: () => {} };
  await assert.rejects(photo.publish(details, actions), /Publish failed/);
  assert.equal(photo.path, path);
  await photo.publish(details, actions); assert.equal(uploads, 1);
  photo.select(file()); assert.equal(photo.path, null);
  await photo.publish(details, actions); assert.equal(uploads, 2);
});

test('malformed success response and changed selection cannot become confirmed attachments', async () => {
  const photo = new PhotoAttachment(); photo.select(file());
  await assert.rejects(photo.publish(details, { upload: async () => ({ photo_path: '' }), create: async () => assert.fail('create called'), stage: () => {} }));
  assert.equal(photo.path, null);
  await assert.rejects(photo.publish(details, { upload: async () => { photo.select(file()); return { photo_path: path }; }, create: async () => assert.fail('create called'), stage: () => {} }), /selected photo changed/);
  assert.equal(photo.path, null);
});

test('isolated PostgreSQL: required photos on RPCs/inserts/updates and legacy history', { skip: !process.env.FOOD_PHOTO_LOCAL_RUNTIME }, async () => {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['scripts/verify-required-photos.mjs', process.env.FOOD_PHOTO_LOCAL_RUNTIME!], { stdio: 'pipe' });
});
