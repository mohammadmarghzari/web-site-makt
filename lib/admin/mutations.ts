"use client";

import { createClient } from "@/lib/supabase/client";
import { productSchema, sceneSchema, settingsSchema } from "@/lib/validators";

/*
 * Admin writes, from the browser.
 *
 * There is no server to gate these, and that is safe for one specific reason:
 * every table has an RLS policy requiring `is_admin()`. Postgres rejects these
 * statements for anyone else regardless of what this file does. The role check
 * that used to live in a Server Action would have been redundant with the
 * policy anyway — it was only ever there for a nicer error message.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const NOT_CONFIGURED = "دیتابیس وصل نیست. کلیدهای Supabase را تنظیم کنید.";

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Maps the Postgres errors an admin can realistically trigger. */
function describeDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "این شناسهٔ نشانی قبلاً استفاده شده است.";
  if (error.code === "42501") return "این حساب اجازهٔ تغییر ندارد. باید نقش مدیر داشته باشید.";
  return `ذخیره نشد: ${error.message}`;
}

export async function saveProduct(
  id: string | null,
  raw: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "برخی فیلدها درست پر نشده‌اند.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  const values = parsed.data;

  // Only one product headlines act 1, so the flag is cleared elsewhere first.
  if (values.is_featured) {
    await supabase
      .from("products")
      .update({ is_featured: false })
      .neq("id", id ?? "00000000-0000-0000-0000-000000000000");
  }

  const query = id
    ? supabase.from("products").update(values).eq("id", id).select("id, slug").single()
    : supabase.from("products").insert(values).select("id, slug").single();

  const { data, error } = await query;
  if (error) {
    return {
      ok: false,
      error: describeDbError(error),
      fieldErrors: error.code === "23505" ? { slug: "شناسه تکراری است" } : undefined,
    };
  }
  return { ok: true, data };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true };
}

export async function reorderProducts(ids: string[]): Promise<ActionResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("products").update({ sort_order: index + 1 }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: describeDbError(failed.error) };
  return { ok: true };
}

export async function saveScene(raw: unknown): Promise<ActionResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const parsed = sceneSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "اطلاعات پرده درست نیست.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const { scene_key, ...values } = parsed.data;
  const { error } = await supabase
    .from("hero_scenes")
    .upsert({ scene_key, ...values }, { onConflict: "scene_key" });

  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true };
}

export async function saveSettings(raw: unknown): Promise<ActionResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "تنظیمات درست پر نشده است.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: 1, ...parsed.data }, { onConflict: "id" });

  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true };
}
