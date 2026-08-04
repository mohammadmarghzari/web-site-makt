import "server-only";

import type { PaymentProvider } from "./types";

/*
 * Local stand-in gateway.
 *
 * ZarinPal's own integrations ship with no sandbox, and the old
 * sandbox.zarinpal.com host is not dependable. Pointing a "sandbox" flag at a
 * possibly-dead server would make the checkout untestable, so instead this
 * implements the same contract entirely in-process and redirects to a page
 * that mimics the gateway.
 *
 * The practical result: the full basket → checkout → pay → receipt journey
 * works today, with no merchant ID. Setting ZARINPAL_MERCHANT_ID and
 * ZARINPAL_SANDBOX=false switches to the real gateway with no other change.
 */
export function createMockProvider(siteUrl: string): PaymentProvider {
  return {
    name: "mock",

    async request({ order, callbackUrl }) {
      // Prefixed so a mock authority is never mistaken for a real one in the
      // database or in logs.
      const authority = `MOCK-${order.order_no}-${Date.now().toString(36).toUpperCase()}`;
      const target = new URL("/checkout/gateway", siteUrl);
      target.searchParams.set("authority", authority);
      target.searchParams.set("callback", callbackUrl);
      return { ok: true, authority, redirectUrl: target.toString() };
    },

    async verify({ authority }) {
      if (!authority.startsWith("MOCK-")) {
        return { ok: false, error: "شناسهٔ تراکنش آزمایشی نامعتبر است." };
      }
      return { ok: true, refId: `TEST${authority.slice(-8)}`, alreadyVerified: false };
    },
  };
}
