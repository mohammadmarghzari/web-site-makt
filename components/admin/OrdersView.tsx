"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { listOrders } from "@/lib/orders/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { formatToman, toFa } from "@/lib/format";
import { Bracket } from "@/components/ui/Bracket";

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void listOrders(100).then((data) => {
      if (cancelled) return;
      setOrders(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Bracket>سفارش‌ها</Bracket>
      <h1 className="type-display mt-2 text-3xl">سفارش‌ها</h1>

      {!isSupabaseConfigured() && (
        <p
          className="mt-5 border border-accent/50 px-4 py-3 text-[13px] leading-relaxed text-ink"
          style={{ borderRadius: "var(--radius)" }}
        >
          دیتابیس وصل نیست، پس سفارشی برای نمایش وجود ندارد.
        </p>
      )}

      {loading ? (
        <p className="type-utility mt-8">در حال بارگذاری…</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-[13px] text-ink-muted">هنوز سفارشی ثبت نشده است.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="border border-line p-4"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="type-utility !text-ink" dir="ltr">
                  {order.order_no}
                </span>
                <span className="type-utility">
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(order.created_at))}
                </span>
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
                <Row label="مشتری" value={order.customer.name} />
                <Row label="موبایل" value={order.customer.phone} ltr />
                <Row label="کد پستی" value={order.customer.postal_code} ltr />
                <Row label="مبلغ" value={formatToman(order.total)} />
              </dl>

              <div className="mt-3 border-t border-line pt-3">
                <span className="type-utility">نشانی</span>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                  {order.customer.address}
                </p>
                {order.customer.note && (
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                    یادداشت: {order.customer.note}
                  </p>
                )}
              </div>

              <ul className="mt-3 space-y-1 border-t border-line pt-3">
                {order.items.map((item, index) => (
                  <li
                    key={`${item.product_id}-${index}`}
                    className="flex justify-between gap-3 text-[13px]"
                  >
                    <span className="text-ink-muted">
                      {item.name_fa}
                      {item.color_name_fa && ` — ${item.color_name_fa}`}
                      {item.quantity > 1 && ` × ${toFa(item.quantity)}`}
                    </span>
                    <span className="shrink-0 text-ink">
                      {formatToman(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-3 sm:justify-start sm:gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
