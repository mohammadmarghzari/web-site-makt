import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Anonymous client used while the site is being built.
 *
 * Deliberately cookie-free. The cookie-bound `@supabase/ssr` client calls
 * `cookies()`, which does not exist during a static export — there is no
 * request to read cookies from. This one only ever fetches public, published
 * rows, so it needs no session at all.
 */
export function createStaticClient() {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
