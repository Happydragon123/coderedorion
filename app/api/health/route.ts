import { NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';
export async function GET() {
  return NextResponse.json({ status: 'ok', auth_configured: Boolean(supabaseConfig()) });
}
