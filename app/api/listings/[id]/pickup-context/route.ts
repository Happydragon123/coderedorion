import { NextResponse } from 'next/server';
import { idSchema, pickupContextResponseSchema } from '@/lib/contracts';
import { pickupContext } from '@/lib/data/food';
import { requireUser } from '@/lib/server/auth';
import { handler, type Context } from '@/lib/server/food/handlers';

const readContext = handler(async (_, context) => {
  const { supabase, user } = await requireUser();
  const id = idSchema.parse((await context.params).id);
  return NextResponse.json(pickupContextResponseSchema.parse(await pickupContext(supabase, id, user.id)));
});

export async function GET(request: Request, context: Context) {
  const response = await readContext(request, context);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
