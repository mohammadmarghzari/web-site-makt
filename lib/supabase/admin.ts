import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, hasServiceRole } from "./env";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * `import "server-only"` makes it a build error to pull this into a Client
 * Component — the one mistake here would leak a key that can read and write
 * every row in the database.
 *
 * Used only where no user session can be trusted with the write: creating
 * orders and marking them paid after gateway verification.
 */
export function createAdminClient() {
  if (!hasServiceRole()) return null;
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
