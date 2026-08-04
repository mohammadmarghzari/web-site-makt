"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order, Product } from "@/lib/types";
import { listOrders } from "@/lib/orders/client";
import { listAllProducts } from "@/lib/repo/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { formatToman, toFa } from "@/lib/format";
import { Bracket } from "@/components/ui/Bracket";

/**
 * Admin overview.
 *
 * Fetches on the client because the site is a static export — the HTML was
 * generated at build time and knows nothing about today's orders.
 */
export function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, o] = await Promise.all([listAllProducts(), listOrders(5)]);
      if (cancelled) return;
      setProducts(p);
      setOrders(o);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="type-utility py-10">در حال بارگذاری…</p>;
  }

  const published = products.filter((p) => p.status === "published").length;
  const drafts = products.filter((p) => p.status === "draft").length;
  const soldOut = products.filter((p) => p.status === "sold_out" || p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 3);
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-10">
      <section>
        <Bracket>یک نگاه</Bracket>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="منتشرشده" value={toFa(published)} />
          <Stat label="پیش‌نویس" value={toFa(drafts)} />
          <Stat label="ناموجود" value={toFa(soldOut)} />
          <Stat label="جمع سفارش‌های اخیر" value={formatToman(revenue)} />
        </dl>
      </section>

      {!isSupabaseConfigured() && (
        <p
          className="border border-accent/50 px-4 py-3 text-[13px] leading-relaxed text-ink"
          style={{ borderRadius: "var(--radius)" }}
        >
          دیتابیس وصل نیست، پس این اعداد از دادهٔ نمونه‌اند و تغییرات ذخیره نمی‌شوند.
        </p>
      )}

      {lowStock.length > 0 && (
        <section>
          <Bracket>رو به اتمام</Bracket>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {lowStock.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                <Link
                  href={`/admin/products/edit?id=${product.id}`}
                  className="text-[13px] text-ink hover:text-accent"
                >
                  {product.name_fa}
                </Link>
                <span className="type-utility">{toFa(product.stock)} عدد</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between gap-4">
          <Bracket>آخرین سفارش‌ها</Bracket>
          <Link href="/admin/orders" className="type-utility hover:!text-accent">
            همه ←
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-muted">هنوز سفارشی ثبت نشده است.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="type-utility !text-ink" dir="ltr">
                  {order.order_no}
                </span>
                <span className="text-[13px] text-ink-muted">{order.customer.name}</span>
                <span className="text-[13px] text-ink">{formatToman(order.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line p-4" style={{ borderRadius: "var(--radius)" }}>
      <dt className="type-utility">{label}</dt>
      <dd className="mt-1.5 text-base text-ink">{value}</dd>
    </div>
  );
}
