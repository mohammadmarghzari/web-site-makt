import "server-only";

import type { PaymentProvider, PaymentRequestResult, PaymentVerifyResult } from "./types";

/*
 * ZarinPal payment gateway, REST API v4.
 *
 * Endpoints and field names follow the published contract:
 *   POST https://payment.zarinpal.com/pg/v4/payment/request.json
 *   POST https://payment.zarinpal.com/pg/v4/payment/verify.json
 *   redirect → https://payment.zarinpal.com/pg/StartPay/{authority}
 *
 * Amount and currency: this store keeps prices in Toman. ZarinPal accepts a
 * `currency` field, so "IRT" is sent explicitly rather than relying on the
 * account default — an account configured for Rial would otherwise charge ten
 * times the intended amount, which is the worst possible bug to find in
 * production.
 */

const BASE = "https://payment.zarinpal.com/pg";
const REQUEST_URL = `${BASE}/v4/payment/request.json`;
const VERIFY_URL = `${BASE}/v4/payment/verify.json`;
const STARTPAY_URL = `${BASE}/StartPay`;

/** Gateway calls must not hang a serverless function until it is killed. */
const TIMEOUT_MS = 15_000;

/** Persian messages for the codes a customer might actually trigger. */
const ERROR_MESSAGES: Record<number, string> = {
  [-9]: "اطلاعات ارسالی به درگاه نامعتبر است.",
  [-10]: "آی‌پی یا کد پذیرندهٔ درگاه صحیح نیست.",
  [-11]: "درخواست مورد نظر یافت نشد.",
  [-12]: "امکان ویرایش درخواست وجود ندارد.",
  [-15]: "درگاه پرداخت غیرفعال است. با پشتیبانی زرین‌پال تماس بگیرید.",
  [-16]: "سطح تأیید پذیرنده پایین‌تر از حد مجاز است.",
  [-30]: "این پذیرنده اجازهٔ این نوع تراکنش را ندارد.",
  [-31]: "حساب بانکی پذیرنده تأیید نشده است.",
  [-33]: "مبلغ تراکنش با مبلغ پرداخت‌شده مطابقت ندارد.",
  [-34]: "سقف تقسیم تراکنش رد شده است.",
  [-40]: "دسترسی به این متد مجاز نیست.",
  [-50]: "مبلغ پرداخت‌شده با مبلغ ارسالی یکسان نیست.",
  [-51]: "پرداخت ناموفق بود.",
  [-52]: "خطای غیرمنتظره از سمت درگاه. با پشتیبانی تماس بگیرید.",
  [-53]: "این پرداخت متعلق به این پذیرنده نیست.",
  [-54]: "شناسهٔ تراکنش نامعتبر است.",
};

function messageForCode(code: number, fallback?: string): string {
  return ERROR_MESSAGES[code] ?? fallback ?? `خطای درگاه پرداخت (کد ${code}).`;
}

/**
 * ZarinPal returns `errors` as an object on failure and an empty array on
 * success, so the shape has to be probed rather than assumed.
 */
function extractError(payload: unknown): { code: number; message?: string } | null {
  if (typeof payload !== "object" || payload === null) return null;
  const errors = (payload as { errors?: unknown }).errors;
  if (Array.isArray(errors)) {
    const first = errors[0] as { code?: number; message?: string } | undefined;
    return first?.code ? { code: first.code, message: first.message } : null;
  }
  if (typeof errors === "object" && errors !== null) {
    const e = errors as { code?: number; message?: string };
    return typeof e.code === "number" ? { code: e.code, message: e.message } : null;
  }
  return null;
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function createZarinpalProvider(merchantId: string): PaymentProvider {
  return {
    name: "zarinpal",

    async request({ order, amount, callbackUrl, description }): Promise<PaymentRequestResult> {
      try {
        const payload = await postJson(REQUEST_URL, {
          merchant_id: merchantId,
          amount,
          currency: "IRT",
          callback_url: callbackUrl,
          description,
          metadata: { mobile: order.customer.phone },
        });

        const data = (payload as { data?: { code?: number; authority?: string } }).data;
        if (data?.code === 100 && data.authority) {
          return {
            ok: true,
            authority: data.authority,
            redirectUrl: `${STARTPAY_URL}/${data.authority}`,
          };
        }

        const error = extractError(payload);
        return {
          ok: false,
          error: error
            ? messageForCode(error.code, error.message)
            : "درگاه پرداخت پاسخ نامعتبر داد.",
        };
      } catch (cause) {
        // Network failure or timeout. On a server outside Iran this is the
        // most likely outcome, so the message says something actionable.
        return {
          ok: false,
          error:
            cause instanceof Error && cause.name === "AbortError"
              ? "درگاه پرداخت در زمان مقرر پاسخ نداد."
              : "اتصال به درگاه پرداخت برقرار نشد.",
        };
      }
    },

    async verify({ authority, amount }): Promise<PaymentVerifyResult> {
      try {
        const payload = await postJson(VERIFY_URL, {
          merchant_id: merchantId,
          amount,
          authority,
        });

        const data = (payload as { data?: { code?: number; ref_id?: number | string } }).data;

        // 100 = verified now. 101 = verified previously; ZarinPal reports it
        // as an error but it means the money was taken, so it must be treated
        // as success or a refreshed return page would show a false failure.
        if (data && (data.code === 100 || data.code === 101)) {
          return {
            ok: true,
            refId: String(data.ref_id ?? ""),
            alreadyVerified: data.code === 101,
          };
        }

        const error = extractError(payload);
        if (error?.code === 101) {
          return { ok: true, refId: "", alreadyVerified: true };
        }

        return {
          ok: false,
          error: error
            ? messageForCode(error.code, error.message)
            : "تأیید پرداخت ناموفق بود.",
        };
      } catch {
        return { ok: false, error: "اتصال به درگاه برای تأیید پرداخت برقرار نشد." };
      }
    },
  };
}
