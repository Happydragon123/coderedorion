import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { validatePhoto, PhotoValidationError } from '../lib/server/food/photo';

test('photo upload rejects spoofed MIME, truncated content, and oversize images', async () => {
  await assert.rejects(validatePhoto(new File(['not an image'],'fake.jpg',{type:'image/jpeg'})), PhotoValidationError);
  const png = await sharp({ create: { width:1,height:1,channels:3,background:'#fff' } }).png().toBuffer();
  await assert.rejects(validatePhoto(new File([new Uint8Array(png)],'wrong.jpg',{type:'image/jpeg'})), PhotoValidationError);
  await assert.rejects(validatePhoto(new File([new Uint8Array([255,216,255])],'broken.jpg',{type:'image/jpeg'})), PhotoValidationError);
  await assert.rejects(validatePhoto(new File([new Uint8Array(5*1024*1024+1)],'huge.png',{type:'image/png'})), PhotoValidationError);
});
test('photo upload decodes, caps dimensions, strips metadata and produces WebP', async () => {
  const source = await sharp({ create:{ width:2000,height:1000,channels:3,background:'#aacc88' } }).withMetadata().jpeg().toBuffer();
  const output = await validatePhoto(new File([new Uint8Array(source)],'photo.jpg',{type:'image/jpeg'}));
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format,'webp'); assert.equal(metadata.width,1600); assert.equal(metadata.height,800);
  assert.equal(metadata.exif,undefined); assert.equal(metadata.icc,undefined);
});
