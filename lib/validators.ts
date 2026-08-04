import { z } from "zod";
import { toLatinDigits } from "./format";

/*
 * Input schemas.
 *
 * Every numeric field is normalised from Persian digits before the pattern is
 * applied — an Iranian keyboard produces ۰۹۱۲…, which no `\d` regex matches.
 */

const digits = (value: unknown) =>
  typeof value === "string" ? toLatinDigits(value).trim() : value;

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "نام و نام خانوادگی را کامل بنویسید")
    .max(80, "نام بیش از حد طولانی است"),
  phone: z
    .preprocess(digits, z.string())
    .refine((v) => /^09\d{9}$/.test(v), "شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد"),
  address: z
    .string()
    .trim()
    .min(10, "آدرس را کامل‌تر بنویسید")
    .max(500, "آدرس بیش از حد طولانی است"),
  postal_code: z
    .preprocess(digits, z.string())
    .refine((v) => /^\d{10}$/.test(v), "کد پستی باید دقیقاً ۱۰ رقم باشد"),
  note: z.string().trim().max(300, "یادداشت بیش از حد طولانی است").optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/**
 * A cart line as it arrives from the browser.
 *
 * Only identity and quantity are accepted. Prices are deliberately absent —
 * the server looks them up, so a tampered basket cannot set its own total.
 */
export const cartLineInputSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  color_hex: z.string().max(16).nullable().optional(),
});

export const checkoutSchema = z.object({
  customer: customerSchema,
  lines: z.array(cartLineInputSchema).min(1, "سبد خرید خالی است").max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ── Admin schemas ────────────────────────────────────────────────────────

const optionalNumber = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(toLatinDigits(String(v)));
    return Number.isFinite(n) ? n : null;
  },
  z.number().int().nullable(),
);

const requiredNumber = (message: string) =>
  z.preprocess((v) => {
    const n = Number(toLatinDigits(String(v ?? "")));
    return Number.isFinite(n) ? n : Number.NaN;
  }, z.number({ message }).min(0, message));

export const colorSchema = z.object({
  name_fa: z.string().trim().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "کد رنگ باید مثل ‎#AABBCC باشد"),
});

export const productSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "شناسهٔ نشانی را بنویسید")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "شناسه فقط حروف کوچک انگلیسی، عدد و خط تیره"),
  name_fa: z.string().trim().min(1, "نام فارسی الزامی است").max(80),
  name_en: z.string().trim().max(80).default(""),
  tagline_fa: z.string().trim().max(120).default(""),
  description_fa: z.string().trim().max(2000).default(""),
  price: requiredNumber("قیمت را درست وارد کنید"),
  compare_price: optionalNumber,
  images: z.array(z.string().url()).max(12).default([]),
  colors: z.array(colorSchema).max(12).default([]),
  scale: z.string().trim().max(20).default("1/12"),
  height_cm: z.preprocess(
    (v) => Number(toLatinDigits(String(v ?? "0"))) || 0,
    z.number().min(0).max(500),
  ),
  material: z.string().trim().max(120).default(""),
  articulation: optionalNumber,
  accessories: z.array(z.string().trim().max(60)).max(20).default([]),
  stock: requiredNumber("موجودی را درست وارد کنید"),
  status: z.enum(["draft", "published", "sold_out"]),
  is_featured: z.boolean().default(false),
  sort_order: requiredNumber("ترتیب را درست وارد کنید"),
});

export type ProductInput = z.infer<typeof productSchema>;

export const sceneSchema = z.object({
  scene_key: z.enum(["act1", "act3"]),
  frames: z.array(z.string().url()).max(240).default([]),
  poster_url: z.string().url().nullable().or(z.literal("")).transform((v) => v || null),
  title_lines: z.array(z.string().trim().max(40)).max(5).default([]),
  subtitle_fa: z.string().trim().max(200).default(""),
  cta_label: z.string().trim().max(40).nullable().or(z.literal("")).transform((v) => v || null),
  cta_href: z.string().trim().max(200).nullable().or(z.literal("")).transform((v) => v || null),
  overlay_alpha: z.preprocess(
    (v) => Number(toLatinDigits(String(v ?? "0.4"))) || 0,
    z.number().min(0).max(1),
  ),
});

export type SceneInput = z.infer<typeof sceneSchema>;

export const settingsSchema = z.object({
  brand_name: z.string().trim().min(1, "نام برند الزامی است").max(40),
  logo_url: z.string().url().nullable().or(z.literal("")).transform((v) => v || null),
  socials: z
    .array(z.object({ label: z.string().trim().max(40), href: z.string().url() }))
    .max(8)
    .default([]),
  footer_note: z.string().trim().max(200).default(""),
  shipping_flat_price: requiredNumber("هزینهٔ ارسال را درست وارد کنید"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("ایمیل معتبر نیست"),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر"),
});
