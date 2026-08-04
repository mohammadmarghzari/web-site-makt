"use server";

import { revalidatePath } from "next/cache";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { productSchema, sceneSchema, settingsSchema } from "@/lib/validators";

/*
 * Admin mutations.
 *
 * Every action re-checks the role server-side. That check is not the only
 * defence — RLS rejects these writes at the database too — but failing here
 * gives a readable Persian error instead of an opaque policy violation.
 *
 * Writes deliberately use the caller's session client rather than the
 * service-role client, so RLS stays in force. A bug in this file cannot become
 * a way to write rows as a non-admin.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const NOT_CONFIGURED =
  "دیتابیس هنوز وصل نشده است. متغیرهای Supabase را در Vercel وارد کنید.";
const FORBIDDEN = "برای این کار باید با حساب مدیر وارد شده باشید.";

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, error: NOT_CONFIGURED };
  if (!(await isAdmin())) return { supabase: null, error: FORBIDDEN };
  return { supabase, error: null };
}

/** Turns Zod issues into a field→message map the forms can render inline. */
function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Revalidates every surface a product edit can appear on. */
function revalidateStorefront(slug?: string) {
  revalidatePath("/");
  revalidatePath("/admin/products");
  if (slug) revalidatePath(`/product/${slug}`);
}

// ── Products ─────────────────────────────────────────────────────────────

export async function saveProduct(
  id: string | null,
  raw: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error! };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "برخی فیلدها درست پر نشده‌اند.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  const values = parsed.data;

  // Only one product headlines act 1. Clearing the flag elsewhere first keeps
  // the homepage deterministic rather than dependent on sort order.
  if (values.is_featured) {
    await supabase.from("products").update({ is_featured: false }).neq("id", id ?? "");
  }

  const query = id
    ? supabase.from("products").update(values).eq("id", id).select("id, slug").single()
    : supabase.from("products").insert(values).select("id, slug").single();

  const { data, error: dbError } = await query;

  if (dbError) {
    // 23505 is a unique violation, which here can only be the slug.
    if (dbError.code === "23505") {
      return {
        ok: false,
        error: "این شناسهٔ نشانی قبلاً استفاده شده است.",
        fieldErrors: { slug: "شناسه تکراری است" },
      };
    }
    return { ok: false, error: `ذخیره نشد: ${dbError.message}` };
  }

  revalidateStorefront(data.slug);
  return { ok: true, data };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error! };

  const { error: dbError } = await supabase.from("products").delete().eq("id", id);
  if (dbError) return { ok: false, error: `حذف نشد: ${dbError.message}` };

  revalidateStorefront();
  return { ok: true };
}

/** Persists a drag-reordered list in one round trip. */
export async function reorderProducts(ids: string[]): Promise<ActionResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error! };

  const updates = ids.map((id, index) =>
    supabase.from("products").update({ sort_order: index + 1 }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: `ترتیب ذخیره نشد: ${failed.error.message}` };

  revalidateStorefront();
  return { ok: true };
}

// ── Hero scenes ──────────────────────────────────────────────────────────

export async function saveScene(raw: unknown): Promise<ActionResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error! };

  const parsed = sceneSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "اطلاعات پرده درست نیست.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const { scene_key, ...values } = parsed.data;
  const { error: dbError } = await supabase
    .from("hero_scenes")
    .upsert({ scene_key, ...values }, { onConflict: "scene_key" });

  if (dbError) return { ok: false, error: `ذخیره نشد: ${dbError.message}` };

  revalidatePath("/");
  revalidatePath("/admin/scenes");
  return { ok: true };
}

// ── Settings ─────────────────────────────────────────────────────────────

export async function saveSettings(raw: unknown): Promise<ActionResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error! };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "تنظیمات درست پر نشده است.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const { error: dbError } = await supabase
    .from("site_settings")
    .upsert({ id: 1, ...parsed.data }, { onConflict: "id" });

  if (dbError) return { ok: false, error: `ذخیره نشد: ${dbError.message}` };

  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true };
}
