"use client";

import { createClient } from "@/lib/supabase/client";
import { sampleProducts, sampleScenes, sampleSettings } from "@/lib/data/sample";
import type { HeroScene, Product, SceneKey, SiteSettings } from "@/lib/types";

/*
 * Browser-side reads.
 *
 * The static build bakes sample data into the HTML so the site renders
 * instantly and correctly with no configuration at all. These functions then
 * fetch the live rows on the client and swap them in, which is what lets an
 * admin edit show up immediately — a static site would otherwise need a full
 * rebuild before anyone saw the change.
 *
 * Everything falls back to the bundled data on error, so a database hiccup
 * degrades the catalogue instead of emptying it.
 */

const PUBLIC_COLUMNS =
  "id, slug, name_fa, name_en, tagline_fa, description_fa, price, compare_price, images, colors, scale, height_cm, material, articulation, accessories, stock, status, is_featured, sort_order, created_at";

/** Published catalogue. Returns null when there is nothing live to swap in. */
export async function fetchPublishedProducts(): Promise<Product[] | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_COLUMNS)
    .neq("status", "draft")
    .order("sort_order", { ascending: true });

  if (error || !data) return null;
  return data as unknown as Product[];
}

export async function fetchScenes(): Promise<Record<SceneKey, HeroScene> | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("hero_scenes").select("*");
  if (error || !data) return null;

  const byKey = new Map(data.map((row) => [row.scene_key as SceneKey, row as unknown as HeroScene]));
  return {
    act1: byKey.get("act1") ?? sampleScenes.act1,
    act3: byKey.get("act3") ?? sampleScenes.act3,
  };
}

export async function fetchSettings(): Promise<SiteSettings | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("site_settings")
    .select("brand_name, logo_url, socials, footer_note, shipping_flat_price")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as SiteSettings;
}

// ── Admin reads ──────────────────────────────────────────────────────────
// Drafts included. RLS is what actually permits this — a non-admin session
// gets the published rows only, whatever this query asks for.

export async function listAllProducts(): Promise<Product[]> {
  const supabase = createClient();
  if (!supabase) return sampleProducts;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Product[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const supabase = createClient();
  if (!supabase) return sampleProducts.find((p) => p.id === id) ?? null;

  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  return (data as unknown as Product) ?? null;
}

export { sampleSettings };
