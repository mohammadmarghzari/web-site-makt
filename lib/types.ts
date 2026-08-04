/*
 * Domain types.
 *
 * These mirror the Postgres schema that lands in phase 3 field-for-field, so
 * that swapping `lib/data/sample.ts` for a Supabase query changes the data
 * source only — never the components that consume it.
 */

export type ProductStatus = "draft" | "published" | "sold_out";

export interface ProductColor {
  name_fa: string;
  hex: string;
}

export interface Product {
  id: string;
  slug: string;
  name_fa: string;
  name_en: string;
  /** Single-line descriptor shown under the name on the card. */
  tagline_fa: string;
  description_fa: string;
  /** Toman, whole numbers only — no minor unit exists in practice. */
  price: number;
  /** Pre-discount price, or null when the item is not on sale. */
  compare_price: number | null;
  /** First entry is the primary image. */
  images: string[];
  colors: ProductColor[];
  /** Collector scale, e.g. "1/12". */
  scale: string;
  height_cm: number;
  material: string;
  /** Number of articulation points, or null when not applicable. */
  articulation: number | null;
  accessories: string[];
  stock: number;
  status: ProductStatus;
  /** Marks the figure that headlines Act 1. */
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

/** Which act a hero scene belongs to. */
export type SceneKey = "act1" | "act3";

export interface HeroScene {
  id: string;
  scene_key: SceneKey;
  /**
   * Ordered frame URLs for the scroll-driven image sequence.
   * Empty in phases 1–2: the procedural frame source stands in until real
   * photography is uploaded, so no binary assets live in the repository.
   */
  frames: string[];
  /** Shown before the coarse loading pass completes, and under reduced motion. */
  poster_url: string | null;
  /** One array entry per hand-broken headline line. */
  title_lines: string[];
  subtitle_fa: string;
  cta_label: string | null;
  cta_href: string | null;
  /** 0..1 — darkness of the scrim over the sequence, protecting text contrast. */
  overlay_alpha: number;
  updated_at: string;
}

export interface SiteSettings {
  brand_name: string;
  logo_url: string | null;
  socials: { label: string; href: string }[];
  footer_note: string;
  /** Flat shipping fee in Toman. */
  shipping_flat_price: number;
}

export type OrderStatus = "pending" | "paid" | "failed" | "canceled";

/**
 * A line in an order.
 *
 * Prices are copied in at checkout rather than joined from `products` at read
 * time: an order is a record of what was actually agreed, and must not change
 * when the product is later re-priced.
 */
export interface OrderItem {
  product_id: string;
  slug: string;
  name_fa: string;
  /** Unit price in Toman at the moment the order was placed. */
  price: number;
  quantity: number;
  color_hex: string | null;
  color_name_fa: string | null;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  postal_code: string;
  note?: string;
}

export interface Order {
  id: string;
  /** Human-facing reference shown to the customer, e.g. "MK-4A7X2Q". */
  order_no: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  customer: OrderCustomer;
  /** Gateway transaction handle; set once the payment request succeeds. */
  authority: string | null;
  /** Gateway reference number, set only after a successful verification. */
  ref_id: string | null;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  role: "customer" | "admin";
  created_at: string;
}
