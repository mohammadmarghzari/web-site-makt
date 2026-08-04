import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Request-scoped Supabase client that carries the user's session cookies.
 *
 * Returns null when Supabase is not configured so callers fall back to sample
 * data rather than throwing.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The middleware refreshes
          // the session on every request, so swallowing this is safe.
        }
      },
    },
  });
}

/**
 * The signed-in user, verified against the auth server.
 *
 * Uses `getUser()` rather than `getSession()` on purpose: `getSession()` reads
 * the token straight out of storage without re-validating it, so its user
 * object must not be trusted for authorisation decisions.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/** Whether the signed-in user carries the admin role. */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !data) return false;
  return data.role === "admin";
}
