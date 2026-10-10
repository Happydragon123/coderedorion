// Explicit opt-in provider smoke test. No database writes or environment output.
import sharp from 'sharp';
import { ApiError } from '../server/api';
import { draftSchema, listingFiltersSchema } from '../contracts';
import { generate } from './gemini';
async function main() {
  if (process.env.FOOD_AI_TEST_RUN !== '1') throw new Error('Set FOOD_AI_TEST_RUN=1 to authorize provider requests.');
  process.loadEnvFile('.env.local');
  const photo = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#fff' } }).webp().toBuffer();
  const draft = await generate('Return a food listing draft with all fields. Unknown fields are null. Never infer safety or dietary claims from a photo.', 'Title: Provider smoke test. Description: Synthetic test only, no food inventory. Count, location, deadline and instructions are unknown. Set photo_path, dietary_tags, ingredients_notes and allergen_notes to null.', draftSchema, photo);
  if (draft.portions_total !== null || draft.location_id !== null || draft.pickup_deadline !== null || draft.dietary_tags !== null) throw new Error('Draft unknown-field check failed');
  console.log('PASS: real Gemini image draft; unknown required fields stayed null.');
  const filters = await generate('Extract only supported listing filters. No locations or origin are supplied; omit those filters.', 'Find vegan food.', listingFiltersSchema);
  if (filters.dietary_tag !== 'vegan') throw new Error('Search dietary extraction check failed');
  console.log('PASS: real Gemini image draft and structured search extraction; unknown required fields stayed null.');
}
main().catch(error => {
  if (error instanceof ApiError) console.error(`${error.code}: ${error.message}`); console.error('FAIL: Gemini verification did not complete. Check local configuration, model support and provider connectivity. No provider response or credentials printed.'); process.exitCode = 1; });
