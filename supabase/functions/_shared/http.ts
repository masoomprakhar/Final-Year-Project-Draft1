import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Client acting as the calling user: it carries their JWT, so Row Level Security applies to every
 * query. The service-role key is deliberately never used by these functions.
 */
export function userClient(req: Request): { db: SupabaseClient; error?: Response } {
  const auth = req.headers.get("Authorization");
  if (!auth) return { db: null as never, error: json({ error: "Missing Authorization header." }, 401) };
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { db };
}

export async function requireUserId(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.auth.getUser();
  return error || !data.user ? null : data.user.id;
}

/** "2026-04-12 12:00" (as the app stores it) <-> timestamptz. Plant clock times are kept as UTC. */
export function toTimestamptz(value: string): string | null {
  const text = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(text)
    ? text.replace(" ", "T") + (text.length === 16 ? ":00" : "") + "Z"
    : text;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function fromTimestamptz(value: string): string {
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}
