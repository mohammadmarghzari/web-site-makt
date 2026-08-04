import { createStaticClient } from "@/lib/supabase/static";
import { catalogueProducts, featuredProduct, sampleProducts } from "@/lib/data/sample";
import type { Product } from "@/lib/types";

/*
 * Product reads.
 *
 * Every function falls back to the bundled sample data when Supabase is not
 * configured, so the site is fully functional before any keys exist. Once the
 * env vars are set the same functions serve live rows — callers never know
 * which happened.
 *
 * A query error also falls back rather than throwing: a transient database
 * problem should degrade the catalogue, not blank the homepage.
 */

/** Columns the public site needs. Kept explicit so new columns never leak. */
const PUBLIC_COLUMNS =
  "id, slug, name_fa, name_en, tagline_fa, description_fa, price, compare_price, images, colors, scale, height_cm, material, articulation, accessories, stock, status, is_featured, sort_order, created_at";

export async function getPublishedProducts(): Promise<Product[]> {
  const supabase = createStaticClient();
  if (!supabase) return catalogueProducts;

  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .neq("status", "draft")
    .order("sort_order", { ascending: true });

  if (error || !data) return catalogueProducts;
  return data as unknown as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createStaticClient();
  if (!supabase) {
    return sampleProducts.find((p) => p.slug === slug && p.status !== "draft") ?? null;
  }

  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .eq("slug", slug)
    .neq("status", "draft")
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as Product;
}

export async function getFeaturedProduct(): Promise<Product | null> {
  const supabase = createStaticClient();
  if (!supabase) return featuredProduct;

  const { data } = await supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .eq("is_featured", true)
    .neq("status", "draft")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data) return data as unknown as Product;

  // No product is flagged featured — fall back to the first in the catalogue
  // rather than rendering act 1 with an empty panel.
  const all = await getPublishedProducts();
  return all[0] ?? null;
}

/**
 * Products by id, for recomputing an order server-side.
 *
 * Includes `draft` rows deliberately: the caller needs to distinguish
 * "unavailable" from "does not exist" when validating a cart.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const supabase = createStaticClient();
  if (!supabase) return sampleProducts.filter((p) => ids.includes(p.id));

  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .in("id", ids);

  if (error || !data) return [];
  return data as unknown as Product[];
}
