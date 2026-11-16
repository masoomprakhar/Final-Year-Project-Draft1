import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public values only: the anon / publishable key is safe in the browser because every table and
// the Storage bucket are protected by Row Level Security. The service-role key is never used here.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(URL && KEY);
}

export function getBrowserSupabase(): SupabaseClient {
  if (!URL || !KEY) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!cached) cached = createClient(URL, KEY);
  return cached;
}
