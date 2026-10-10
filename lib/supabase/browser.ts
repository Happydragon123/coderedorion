'use client';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig, missingSupabaseMessage } from './config';
export function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error(missingSupabaseMessage);
  return createBrowserClient(config.url, config.key);
}
