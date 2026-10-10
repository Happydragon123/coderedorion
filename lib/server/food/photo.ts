import sharp from 'sharp';
import { MEDIA_LIMITS } from '../../contracts';
export class PhotoValidationError extends Error {}
export async function validatePhoto(file: File): Promise<Buffer> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!bytes.length || bytes.length > MEDIA_LIMITS.photoBytes || !((jpeg && file.type === 'image/jpeg') || (png && file.type === 'image/png') || (webp && file.type === 'image/webp'))) throw new PhotoValidationError('Invalid image content.');
  try {
    return await sharp(bytes, { limitInputPixels: 25_000_000, animated: false, failOn: 'warning' }).rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer();
  } catch { throw new PhotoValidationError('Image could not be decoded.'); }
}
