import "server-only";

import { createClient } from "@/lib/supabase/server";
import { sampleProducts } from "@/lib/data/sample";
import type { Product } from "@/lib/types";

/*
 * Admin-scoped reads.
 *
 * These differ from `lib/repo/products.ts` in one way that matters: drafts are
 * included. The public repo filters them out so an unfinished product can
 * never leak, and RLS enforces the same rule server-side — the admin session
 * is what unlocks them here.
 */

const ALL_COLUMNS = "*";

export async function listAllProducts(): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return sampleProducts;

  const { data, error } = await supabase
    .from("products")
    .select(ALL_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Product[];
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  if (!supabase) return sampleProducts.find((p) => p.id === id) ?? null;

  const { data } = await supabase
    .from("products")
    .select(ALL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as Product) ?? null;
}
