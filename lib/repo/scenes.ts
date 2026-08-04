import { createClient } from "@/lib/supabase/server";
import { sampleScenes } from "@/lib/data/sample";
import type { HeroScene, SceneKey } from "@/lib/types";

/** Hero scene for one act, falling back to the bundled copy. */
export async function getScene(key: SceneKey): Promise<HeroScene> {
  const supabase = await createClient();
  if (!supabase) return sampleScenes[key];

  const { data, error } = await supabase
    .from("hero_scenes")
    .select("*")
    .eq("scene_key", key)
    .maybeSingle();

  if (error || !data) return sampleScenes[key];
  return data as unknown as HeroScene;
}

export async function getAllScenes(): Promise<Record<SceneKey, HeroScene>> {
  const [act1, act3] = await Promise.all([getScene("act1"), getScene("act3")]);
  return { act1, act3 };
}
