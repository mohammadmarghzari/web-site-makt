import type { HeroScene, Product, SiteSettings } from "@/lib/types";

/*
 * Phase 1–2 stand-in content.
 *
 * Everything here is typed against `lib/types.ts`, which mirrors the Postgres
 * schema. Phase 3 replaces this module with Supabase queries and nothing
 * downstream has to change.
 *
 * `images` is deliberately empty: no photography exists yet, and binary assets
 * do not belong in the repository. `FigurePlaceholder` renders a deterministic
 * vector stand-in whenever a product has no image.
 */

export const sampleProducts: Product[] = [
  {
    id: "0f1b7c2e-0001-4a10-9c31-000000000001",
    slug: "arash",
    name_fa: "آرش",
    name_en: "ARASH",
    tagline_fa: "کمان‌دار، با تیر و ترکش کامل",
    description_fa:
      "پیکرهٔ آرش کمان‌گیر با مفصل‌بندی کامل شانه و آرنج، طراحی‌شده برای گرفتن حالت کشیدن کمان بدون پایهٔ کمکی. پارچهٔ ردا جداگانه قالب‌گیری شده و روی بدنه می‌نشیند.",
    price: 1_290_000,
    compare_price: 1_490_000,
    images: [],
    colors: [
      { name_fa: "نقره‌ای سرد", hex: "#c9d3da" },
      { name_fa: "خاکستری تیره", hex: "#5a6a76" },
      { name_fa: "برنز مات", hex: "#8a7a63" },
    ],
    scale: "1/12",
    height_cm: 16.5,
    material: "PVC و ABS",
    articulation: 28,
    accessories: ["کمان", "ترکش", "سه دست تعویضی", "پایهٔ نمایش"],
    stock: 12,
    status: "published",
    is_featured: true,
    sort_order: 1,
    created_at: "2026-01-12T09:00:00.000Z",
  },
  {
    id: "0f1b7c2e-0002-4a10-9c31-000000000002",
    slug: "simorgh",
    name_fa: "سیمرغ",
    name_en: "SIMORGH",
    tagline_fa: "بال‌های متحرک، جزئیات پر",
    description_fa:
      "سیمرغ با بال‌های چندبخشی که هر پر آن جداگانه قالب‌گیری شده است. مفصل بال اجازهٔ باز و بستهٔ کامل می‌دهد و در حالت باز، دهانهٔ بال به ۳۴ سانتی‌متر می‌رسد.",
    price: 2_450_000,
    compare_price: null,
    images: [],
    colors: [
      { name_fa: "فیروزه‌ای دودی", hex: "#6f9aa4" },
      { name_fa: "نقره‌ای سرد", hex: "#c9d3da" },
    ],
    scale: "1/12",
    height_cm: 22,
    material: "PVC و رزین",
    articulation: 34,
    accessories: ["پایهٔ پرواز", "دو جفت بال تعویضی"],
    stock: 5,
    status: "published",
    is_featured: false,
    sort_order: 2,
    created_at: "2026-01-18T09:00:00.000Z",
  },
  {
    id: "0f1b7c2e-0003-4a10-9c31-000000000003",
    slug: "kaveh",
    name_fa: "کاوه",
    name_en: "KAVEH",
    tagline_fa: "درفش کاویانی، پارچهٔ واقعی",
    description_fa:
      "کاوهٔ آهنگر همراه با درفش کاویانی از پارچهٔ واقعی و میلهٔ فلزی. پیش‌بند چرمی‌نما و چکش، هر دو قابل جداشدن هستند.",
    price: 1_690_000,
    compare_price: null,
    images: [],
    colors: [
      { name_fa: "خاکستری آهن", hex: "#6b7680" },
      { name_fa: "سرخ کهنه", hex: "#8f5a52" },
    ],
    scale: "1/12",
    height_cm: 17,
    material: "PVC و پارچه",
    articulation: 26,
    accessories: ["درفش", "چکش", "سندان کوچک", "پایهٔ نمایش"],
    stock: 0,
    status: "sold_out",
    is_featured: false,
    sort_order: 3,
    created_at: "2026-02-02T09:00:00.000Z",
  },
  {
    id: "0f1b7c2e-0004-4a10-9c31-000000000004",
    slug: "rostam",
    name_fa: "رستم",
    name_en: "ROSTAM",
    tagline_fa: "زره چندلایه، ببر بیان",
    description_fa:
      "رستم با زره چندلایه و پوستین ببر بیان. سنگین‌ترین پیکرهٔ مجموعه با اسکلت داخلی فلزی که تعادل را در حالت‌های نامتقارن حفظ می‌کند.",
    price: 2_890_000,
    compare_price: 3_190_000,
    images: [],
    colors: [
      { name_fa: "برنز تیره", hex: "#7d6a52" },
      { name_fa: "خاکستری آهن", hex: "#6b7680" },
      { name_fa: "نارنجی ببر", hex: "#b07c4a" },
    ],
    scale: "1/12",
    height_cm: 18.5,
    material: "PVC، ABS و اسکلت فلزی",
    articulation: 32,
    accessories: ["گرز گاوسر", "کمند", "سپر", "دو سر تعویضی"],
    stock: 3,
    status: "published",
    is_featured: false,
    sort_order: 4,
    created_at: "2026-02-20T09:00:00.000Z",
  },
  {
    id: "0f1b7c2e-0005-4a10-9c31-000000000005",
    slug: "zarvan",
    name_fa: "زروان",
    name_en: "ZARVAN",
    tagline_fa: "نسخهٔ محدود، شماره‌گذاری‌شده",
    description_fa:
      "زروان، ایزد زمان، در نسخهٔ محدود ۳۰۰ عددی. هر پیکره روی پایه شماره‌گذاری شده و با گواهی اصالت عرضه می‌شود. حلقهٔ زمان دور پیکره آزادانه می‌چرخد.",
    price: 3_450_000,
    compare_price: null,
    images: [],
    colors: [{ name_fa: "نقرهٔ آینه‌ای", hex: "#d8e2e8" }],
    scale: "1/12",
    height_cm: 20,
    material: "رزین و آبکاری کروم",
    articulation: 18,
    accessories: ["حلقهٔ زمان", "پایهٔ شماره‌دار", "گواهی اصالت"],
    stock: 2,
    status: "published",
    is_featured: false,
    sort_order: 5,
    created_at: "2026-03-05T09:00:00.000Z",
  },
  {
    id: "0f1b7c2e-0006-4a10-9c31-000000000006",
    slug: "azarakhsh",
    name_fa: "آذرخش",
    name_en: "AZARAKHSH",
    tagline_fa: "قطعات شفاف، جلوهٔ صاعقه",
    description_fa:
      "آذرخش با قطعات شفاف رنگی که جلوهٔ صاعقه را می‌سازند. قطعات افکت روی مفاصل سوار می‌شوند و بدون ابزار جدا می‌شوند.",
    price: 1_950_000,
    compare_price: null,
    images: [],
    colors: [
      { name_fa: "آبی شفاف", hex: "#8fb6c9" },
      { name_fa: "دودی شفاف", hex: "#9aa6ae" },
    ],
    scale: "1/12",
    height_cm: 16,
    material: "PVC و PC شفاف",
    articulation: 30,
    accessories: ["چهار قطعهٔ افکت", "پایهٔ نمایش", "دست تعویضی"],
    stock: 8,
    status: "published",
    is_featured: false,
    sort_order: 6,
    created_at: "2026-03-21T09:00:00.000Z",
  },
];

export const sampleScenes: Record<HeroScene["scene_key"], HeroScene> = {
  act1: {
    id: "9a2c4d10-0001-4b21-8e40-000000000001",
    scene_key: "act1",
    frames: [],
    poster_url: null,
    title_lines: ["ساخته شده", "برای", "دست‌های تو"],
    subtitle_fa: "مجموعهٔ اکشن‌فیگور MAKT — مقیاس ۱/۱۲",
    cta_label: "خرید آرش",
    cta_href: "/product/arash",
    overlay_alpha: 0.38,
    updated_at: "2026-03-21T09:00:00.000Z",
  },
  act3: {
    id: "9a2c4d10-0002-4b21-8e40-000000000002",
    scene_key: "act3",
    frames: [],
    poster_url: null,
    title_lines: ["ما", "کوچک", "می‌سازیم"],
    subtitle_fa: "هر مفصل، هر خط، هر رنگ — دستی بازبینی می‌شود.",
    cta_label: "دیدن کاتالوگ",
    cta_href: "#act-2",
    overlay_alpha: 0.46,
    updated_at: "2026-03-21T09:00:00.000Z",
  },
};

export const sampleSettings: SiteSettings = {
  brand_name: "MAKT",
  logo_url: null,
  socials: [
    { label: "اینستاگرام", href: "https://instagram.com" },
    { label: "تلگرام", href: "https://telegram.org" },
  ],
  footer_note: "ساخته‌شده در ایران — ارسال به سراسر کشور",
  shipping_flat_price: 89_000,
};

/** The figure that headlines Act 1; falls back to the first product. */
export const featuredProduct: Product =
  sampleProducts.find((p) => p.is_featured) ?? sampleProducts[0];

/** Products shown in the Act 2 grid, in admin-defined order. */
export const catalogueProducts: Product[] = [...sampleProducts]
  .filter((p) => p.status !== "draft")
  .sort((a, b) => a.sort_order - b.sort_order);
