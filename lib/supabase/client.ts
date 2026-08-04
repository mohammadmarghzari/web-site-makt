"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Browser client, used for auth forms and direct-to-Storage uploads.
 *
 * Uploading straight from the browser keeps large image and frame files off
 * the serverless function entirely, which matters because Vercel caps request
 * body size well below a batch of hero frames.
 */
export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
