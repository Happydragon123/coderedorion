// Explicit provider check; never print credentials, sessions or model output.
import { createServerClient } from '@supabase/ssr';
import { draftResponseSchema, errorEnvelopeSchema, searchResponseSchema } from '../lib/contracts';
async function main() {
  if (process.argv[2] !== '--live' || !process.argv[3]) throw new Error();
  process.loadEnvFile('.env.local');
  const base = new URL(process.argv[3]).origin;
  const jar = new Map<string, string>();
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(({ name, value }) => jar.set(name, value)) } });
  const auth = await db.auth.signInWithPassword({ email: process.env.FOOD_TEST_ORGANIZER_EMAIL!, password: process.env.FOOD_TEST_ORGANIZER_PASSWORD! });
  if (auth.error) throw new Error();
  try {
    const draft = new FormData();
    draft.set('description', 'Title: DEMO configuration check. Count, location, instructions and deadline are unknown. Do not infer safety or dietary claims.');
    for (const [path, body, schema] of [
      ['/api/ai/search', JSON.stringify({ query: 'Find vegetarian food' }), searchResponseSchema],
      ['/api/ai/listing-draft', draft, draftResponseSchema],
    ] as const) {
      const response = await fetch(base + path, { method: 'POST', signal: AbortSignal.timeout(65000), headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '), ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}) }, body });
      const json = await response.json();
      if (response.ok) { schema.parse(json); console.log(`${path}: PASS (HTTP ${response.status}, valid contract)`); }
      else { const error = errorEnvelopeSchema.parse(json); console.log(`${path}: HTTP ${response.status} ${error.error.code}: ${error.error.message}`); process.exitCode = 1; }
    }
  } finally { await db.auth.signOut({ scope: 'local' }); }
}
main().catch(() => { console.error('AI configuration check did not complete. Check private test credentials, URL and connectivity. No credentials or model output logged.'); process.exitCode = 1; });
