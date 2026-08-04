import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderCustomer, OrderItem, OrderStatus } from "@/lib/types";

/*
 * Order persistence.
 *
 * Orders are the one table with no public access at all, so every write here
 * goes through the service-role client. When Supabase is not configured the
 * repository falls back to an in-process map purely so the checkout and
 * payment flow stays exercisable end to end — see the warning on
 * `memoryOrders` before relying on it for anything real.
 */

/**
 * Non-persistent fallback store.
 *
 * ⚠️ This lives in the module scope of a single server process. It is wiped on
 * restart and is not shared between serverless instances, so an order created
 * by one invocation may be invisible to the next. It exists to keep the flow
 * testable before a database is attached — never as a production store.
 */
const memoryOrders = new Map<string, Order>();

/** Crockford-ish base32, minus vowels, so a reference can be read aloud. */
const ALPHABET = "0123456789BCDFGHJKLMNPQRSTVWXYZ";

export function generateOrderNo(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `MK-${out}`;
}

export interface NewOrder {
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  customer: OrderCustomer;
}

export async function createOrder(input: NewOrder): Promise<Order> {
  const order_no = generateOrderNo();
  const supabase = createAdminClient();

  if (!supabase) {
    const order: Order = {
      id: crypto.randomUUID(),
      order_no,
      ...input,
      authority: null,
      ref_id: null,
      status: "pending",
      created_at: new Date().toISOString(),
      paid_at: null,
    };
    memoryOrders.set(order.id, order);
    return order;
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({ order_no, ...input, status: "pending" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`ثبت سفارش ناموفق بود: ${error?.message ?? "پاسخ خالی"}`);
  }
  return data as unknown as Order;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = createAdminClient();
  if (!supabase) return memoryOrders.get(id) ?? null;

  const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  return (data as unknown as Order) ?? null;
}

export async function getOrderByAuthority(authority: string): Promise<Order | null> {
  const supabase = createAdminClient();
  if (!supabase) {
    for (const order of memoryOrders.values()) {
      if (order.authority === authority) return order;
    }
    return null;
  }

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("authority", authority)
    .maybeSingle();
  return (data as unknown as Order) ?? null;
}

/** Records the gateway handle once the payment request has been accepted. */
export async function attachAuthority(id: string, authority: string): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) {
    const order = memoryOrders.get(id);
    if (order) memoryOrders.set(id, { ...order, authority });
    return;
  }
  await supabase.from("orders").update({ authority }).eq("id", id);
}

/**
 * Marks an order paid.
 *
 * Guarded by `status = 'pending'` so a replayed callback cannot overwrite an
 * already-settled order or move a failed one to paid. Returns the order as it
 * now stands either way, so the caller can render the receipt regardless of
 * whether this particular request was the one that settled it.
 */
export async function markPaid(id: string, refId: string): Promise<Order | null> {
  const supabase = createAdminClient();
  const paid_at = new Date().toISOString();

  if (!supabase) {
    const order = memoryOrders.get(id);
    if (!order) return null;
    if (order.status === "paid") return order;
    const updated: Order = { ...order, status: "paid", ref_id: refId, paid_at };
    memoryOrders.set(id, updated);
    return updated;
  }

  const { data } = await supabase
    .from("orders")
    .update({ status: "paid", ref_id: refId, paid_at })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (data) return data as unknown as Order;
  // The conditional update matched nothing, which normally means a concurrent
  // request already settled it. Return the current row rather than an error.
  return getOrderById(id);
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) {
    const order = memoryOrders.get(id);
    if (order && order.status === "pending") {
      memoryOrders.set(id, { ...order, status });
    }
    return;
  }
  // Only a pending order may be failed or canceled; a paid one is final.
  await supabase.from("orders").update({ status }).eq("id", id).eq("status", "pending");
}

/** Admin order list, newest first. */
export async function listOrders(limit = 50): Promise<Order[]> {
  const supabase = createAdminClient();
  if (!supabase) {
    return [...memoryOrders.values()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }

  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as Order[]) ?? [];
}

/**
 * Decrements stock for the lines in a paid order.
 *
 * Best-effort and deliberately non-fatal: the customer has already paid, so a
 * stock write failing must never turn a successful payment into an error page.
 */
export async function decrementStock(items: OrderItem[]): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  for (const item of items) {
    const { data } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .maybeSingle();
    if (!data) continue;
    const next = Math.max(0, (data.stock as number) - item.quantity);
    await supabase
      .from("products")
      .update({ stock: next, ...(next === 0 ? { status: "sold_out" } : {}) })
      .eq("id", item.product_id);
  }
}
