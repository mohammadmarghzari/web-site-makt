import { createStaticClient } from "@/lib/supabase/static";
import { sampleSettings } from "@/lib/data/sample";
import type { SiteSettings } from "@/lib/types";

/** Site-wide settings, falling back to the bundled defaults. */
export async function getSettings(): Promise<SiteSettings> {
  const supabase = createStaticClient();
  if (!supabase) return sampleSettings;

  const { data, error } = await supabase
    .from("site_settings")
    .select("brand_name, logo_url, socials, footer_note, shipping_flat_price")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return sampleSettings;
  return data as unknown as SiteSettings;
}
