"use server";

import { buildQuote, describeProblem } from "@/lib/checkout/quote";
import { attachAuthority, createOrder } from "@/lib/repo/orders";
import { getPaymentProvider, getSiteUrl } from "@/lib/payment";
import { checkoutSchema } from "@/lib/validators";

/*
 * Checkout entry point.
 *
 * Order of operations matters here:
 *   1. validate the shape of the submission
 *   2. re-price it entirely from the database
 *   3. create the order as `pending`
 *   4. only then ask the gateway to open a transaction
 *
 * The order exists before the gateway is contacted so the return callback
 * always has something to reconcile against, even if the customer closes the
 * tab mid-payment.
 */

export type CheckoutResult =
  | { ok: true; redirectUrl: string; orderId: string }
  | { ok: false; error: string; problems?: string[] };

export async function submitCheckout(raw: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "اطلاعات فرم کامل نیست." };
  }

  const quote = await buildQuote(parsed.data);

  // Any rejected line is reported rather than silently dropped — quietly
  // charging for a different basket than the customer reviewed is worse than
  // making them look again.
  if (quote.problems.length > 0) {
    return {
      ok: false,
      error: "سبد خرید تغییر کرده است. لطفاً دوباره بررسی کنید.",
      problems: quote.problems.map(describeProblem),
    };
  }

  if (quote.items.length === 0) {
    return { ok: false, error: "سبد خرید خالی است." };
  }

  let order;
  try {
    order = await createOrder({
      items: quote.items,
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      total: quote.total,
      customer: parsed.data.customer,
    });
  } catch {
    return { ok: false, error: "ثبت سفارش ممکن نشد. کمی بعد دوباره تلاش کنید." };
  }

  const provider = getPaymentProvider();
  const callbackUrl = `${getSiteUrl()}/api/payment/verify?order=${order.id}`;

  const result = await provider.request({
    order,
    amount: quote.total,
    callbackUrl,
    description: `سفارش ${order.order_no} — فروشگاه MAKT`,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await attachAuthority(order.id, result.authority);
  return { ok: true, redirectUrl: result.redirectUrl, orderId: order.id };
}
