"use client";

import { useEffect, useState } from "react";
import type { PlacedOrder } from "@/lib/orders/client";
import { Bracket } from "@/components/ui/Bracket";
import { ButtonLink } from "@/components/ui/Button";
import { formatToman } from "@/lib/format";

/*
 * Order confirmation.
 *
 * The page is a static file, so there is nothing to look an order up against.
 * The figures shown here were returned by the database when the order was
 * placed and handed over in sessionStorage — they are a record of what the
 * server decided, not something this page recalculated.
 *
 * Read once and cleared, so a stale confirmation cannot reappear later.
 */
export function OrderReceipt() {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("makt.lastOrder");
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "order_no" in parsed) {
          setOrder(parsed as PlacedOrder);
        }
        sessionStorage.removeItem("makt.lastOrder");
      }
    } catch {
      // Nothing usable stored; fall through to the generic confirmation.
    }
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-[40dvh]" aria-hidden="true" />;

  return (
    <div className="mx-auto w-full max-w-lg">
      <Bracket>نتیجهٔ سفارش</Bracket>
      <h1 className="type-display mt-4 text-4xl sm:text-5xl">
        {order ? "سفارش ثبت شد" : "سفارشی پیدا نشد"}
      </h1>

      <p className="mt-5 text-sm leading-relaxed text-ink-muted">
        {order
          ? "برای هماهنگی پرداخت و ارسال، به‌زودی با شما تماس می‌گیریم. شمارهٔ سفارش را نگه دارید."
          : "این صفحه فقط بلافاصله بعد از ثبت سفارش اطلاعات نشان می‌دهد. اگر سفارشی ثبت کرده‌اید، شمارهٔ آن برایتان پیامک یا اعلام می‌شود."}
      </p>

      {order && (
        <dl
          className="mt-8 space-y-3 border border-line p-5 text-[13px]"
          style={{ borderRadius: "var(--radius)" }}
        >
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">شمارهٔ سفارش</dt>
            <dd className="text-ink" dir="ltr">
              {order.order_no}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-3">
            <dt className="text-ink-muted">جمع کالاها</dt>
            <dd className="text-ink">{formatToman(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">هزینهٔ ارسال</dt>
            <dd className="text-ink">
              {order.shipping > 0 ? formatToman(order.shipping) : "رایگان"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-3">
            <dt className="type-utility !text-ink">مبلغ نهایی</dt>
            <dd className="text-base text-ink">{formatToman(order.total)}</dd>
          </div>
        </dl>
      )}

      <div className="mt-8">
        <ButtonLink href="/">بازگشت به فروشگاه</ButtonLink>
      </div>
    </div>
  );
}
