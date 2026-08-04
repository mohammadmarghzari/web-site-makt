"use client";

import { createClient } from "@/lib/supabase/client";
import type { Order, OrderCustomer } from "@/lib/types";

/*
 * Order operations, from the browser.
 *
 * There is no server here, so the obvious approach — insert a row with the
 * totals the page calculated — would let anyone set their own price by editing
 * the request. Instead every order goes through `place_order`, a
 * SECURITY DEFINER function in Postgres that ignores whatever amounts the
 * client sends, re-reads prices and stock from the products table, and
 * computes the totals itself.
 *
 * The database is the server. The browser only says *what* it wants to buy,
 * never what it costs.
 */

export interface PlacedOrder {
  order_no: string;
  subtotal: number;
  shipping: number;
  total: number;
}

export interface OrderLineInput {
  product_id: string;
  quantity: number;
  color_hex: string | null;
}

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; error: string };

export async function placeOrder(
  items: OrderLineInput[],
  customer: OrderCustomer,
): Promise<PlaceOrderResult> {
  const supabase = createClient();
  if (!supabase) {
    return {
      ok: false,
      error: "ثبت سفارش نیاز به اتصال دیتابیس دارد. هنوز Supabase وصل نشده است.",
    };
  }

  const { data, error } = await supabase.rpc("place_order", {
    p_items: items,
    p_customer: customer,
  });

  if (error) {
    // The function raises Persian messages for the cases a customer can
    // actually cause — out of stock, unpublished item, empty basket.
    return { ok: false, error: error.message || "ثبت سفارش ناموفق بود." };
  }
  if (!data) return { ok: false, error: "پاسخی از سرور دریافت نشد." };

  return { ok: true, order: data as PlacedOrder };
}

/** Admin-only order list. RLS rejects this for anyone without the admin role. */
export async function listOrders(limit = 100): Promise<Order[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as Order[];
}
