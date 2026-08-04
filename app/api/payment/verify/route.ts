import { NextResponse, type NextRequest } from "next/server";
import { getOrderById, markPaid, setOrderStatus, decrementStock } from "@/lib/repo/orders";
import { getPaymentProvider, getSiteUrl } from "@/lib/payment";

/*
 * Gateway return callback.
 *
 * Idempotency is the whole job here. The customer lands on this URL from the
 * bank, and may refresh it, press back, or have it retried — none of which may
 * settle the order twice or turn an already-paid order into a failure.
 *
 * Three things make that hold:
 *   1. An order already `paid` short-circuits before the gateway is called.
 *   2. `markPaid` updates conditionally on `status = 'pending'`.
 *   3. ZarinPal's "already verified" code (101) is treated as success.
 *
 * The amount is always taken from the stored order, never from the query
 * string, so a hand-edited return URL cannot settle an order for the wrong sum.
 */

export const dynamic = "force-dynamic";

function redirectTo(path: string, params: Record<string, string>) {
  const url = new URL(path, getSiteUrl());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const orderId = query.get("order");
  // ZarinPal returns `Authority` and `Status`; the mock gateway mirrors them.
  const authority = query.get("Authority") ?? query.get("authority");
  const status = query.get("Status") ?? query.get("status");

  if (!orderId) {
    return redirectTo("/checkout/result", { state: "failed", reason: "شناسهٔ سفارش یافت نشد." });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return redirectTo("/checkout/result", { state: "failed", reason: "سفارش یافت نشد." });
  }

  // Already settled — a refresh of this page. Show the receipt, do not re-verify.
  if (order.status === "paid") {
    return redirectTo("/checkout/result", { state: "paid", order: order.id });
  }

  if (status && status.toUpperCase() !== "OK") {
    await setOrderStatus(order.id, "canceled");
    return redirectTo("/checkout/result", {
      state: "canceled",
      order: order.id,
      reason: "پرداخت توسط شما لغو شد.",
    });
  }

  if (!authority) {
    await setOrderStatus(order.id, "failed");
    return redirectTo("/checkout/result", {
      state: "failed",
      order: order.id,
      reason: "شناسهٔ تراکنش دریافت نشد.",
    });
  }

  const provider = getPaymentProvider();
  const result = await provider.verify({ authority, amount: order.total });

  if (!result.ok) {
    await setOrderStatus(order.id, "failed");
    return redirectTo("/checkout/result", {
      state: "failed",
      order: order.id,
      reason: result.error,
    });
  }

  const updated = await markPaid(order.id, result.refId);

  // Stock is reduced only on the transition into `paid`, so a replayed
  // callback cannot decrement inventory a second time.
  if (updated && updated.status === "paid" && order.status === "pending") {
    await decrementStock(order.items);
  }

  return redirectTo("/checkout/result", { state: "paid", order: order.id });
}
