import "server-only";

import type { PaymentProvider } from "./types";
import { createMockProvider } from "./mock";
import { createZarinpalProvider } from "./zarinpal";

export type { PaymentProvider } from "./types";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

/**
 * Chooses the gateway for this deployment.
 *
 * The mock is used whenever sandbox mode is on *or* no merchant ID is set.
 * That second condition matters: a half-configured production deploy should
 * fall back to something that visibly says "test payment" rather than throw a
 * five-hundred at a customer mid-purchase.
 */
export function getPaymentProvider(): PaymentProvider {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID ?? "";
  const sandbox = process.env.ZARINPAL_SANDBOX !== "false";

  if (sandbox || merchantId.length === 0) {
    return createMockProvider(getSiteUrl());
  }
  return createZarinpalProvider(merchantId);
}

/** True when payments are simulated, so the UI can say so plainly. */
export function isMockPayment(): boolean {
  return getPaymentProvider().name === "mock";
}
