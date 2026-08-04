/*
 * Single place that decides whether the store is running on a real database.
 *
 * Everything downstream branches on `isSupabaseConfigured()`. Until the env
 * vars are set in Vercel the whole site runs on the bundled sample data, so a
 * missing key is a supported state rather than a crash.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Server-only. Never expose this to the browser. */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/**
 * True when the server can write with elevated privileges — required for
 * orders, which no anonymous role is allowed to touch.
 */
export function hasServiceRole(): boolean {
  return isSupabaseConfigured() && SUPABASE_SERVICE_ROLE_KEY.length > 0;
}
