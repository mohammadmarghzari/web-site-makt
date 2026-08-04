import type { Order } from "@/lib/types";

/**
 * Payment gateway abstraction.
 *
 * The whole point of this seam is that swapping ZarinPal for another provider
 * — or for the built-in mock — touches one factory function and nothing else.
 * It also means the checkout flow is fully testable without a merchant ID.
 */
export interface PaymentProvider {
  readonly name: string;

  /**
   * Opens a transaction. `amount` is in Toman and is always computed
   * server-side from the database, never taken from the client.
   */
  request(params: {
    order: Order;
    amount: number;
    callbackUrl: string;
    description: string;
  }): Promise<PaymentRequestResult>;

  /**
   * Confirms a transaction with the gateway. Must be safe to call more than
   * once for the same authority — a customer refreshing the return page is
   * normal, and must not double-settle or error.
   */
  verify(params: { authority: string; amount: number }): Promise<PaymentVerifyResult>;
}

export type PaymentRequestResult =
  | { ok: true; authority: string; redirectUrl: string }
  | { ok: false; error: string };

export type PaymentVerifyResult =
  | { ok: true; refId: string; alreadyVerified: boolean }
  | { ok: false; error: string };
