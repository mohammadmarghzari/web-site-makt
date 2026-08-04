import Link from "next/link";
import { listAllProducts } from "@/lib/repo/admin";
import { listOrders } from "@/lib/repo/orders";
import { isMockPayment } from "@/lib/payment";
import { hasServiceRole } from "@/lib/supabase/env";
import { formatToman, toFa } from "@/lib/format";
import { Bracket } from "@/components/ui/Bracket";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [products, orders] = await Promise.all([listAllProducts(), listOrders(5)]);

  const published = products.filter((p) => p.status === "published").length;
  const drafts = products.filter((p) => p.status === "draft").length;
  const soldOut = products.filter((p) => p.status === "sold_out" || p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 3);
  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-10">
      <section>
        <Bracket>یک نگاه</Bracket>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="منتشرشده" value={toFa(published)} />
          <Stat label="پیش‌نویس" value={toFa(drafts)} />
          <Stat label="ناموجود" value={toFa(soldOut)} />
          <Stat label="فروش پرداخت‌شده" value={formatToman(revenue)} />
        </dl>
      </section>

      {/* Operational warnings first — these are the things that silently break
          a live store, and the operator should not have to go looking. */}
      {(isMockPayment() || !hasServiceRole()) && (
        <section className="space-y-3">
          <Bracket>هشدارها</Bracket>
          {isMockPayment() && (
            <Warning>
              درگاه پرداخت در حالت آزمایشی است — سفارش‌ها ثبت می‌شوند ولی هیچ پولی
              جابه‌جا نمی‌شود. برای فعال‌کردن پرداخت واقعی،{" "}
              <code dir="ltr">ZARINPAL_MERCHANT_ID</code> را در Vercel وارد و{" "}
              <code dir="ltr">ZARINPAL_SANDBOX</code> را <code dir="ltr">false</code> کنید.
            </Warning>
          )}
          {!hasServiceRole() && (
            <Warning>
              <code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code> تنظیم نشده است. بدون آن
              سفارش‌ها در دیتابیس ذخیره نمی‌شوند و با هر بار ری‌استارت سرور پاک می‌شوند.
            </Warning>
          )}
        </section>
      )}

      {lowStock.length > 0 && (
        <section>
          <Bracket>رو به اتمام</Bracket>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {lowStock.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                <Link
                  href={`/admin/products/${product.id}`}
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
                <OrderStatusBadge status={order.status} />
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

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="border border-accent/50 px-4 py-3 text-[13px] leading-relaxed text-ink"
      style={{ borderRadius: "var(--radius)" }}
    >
      {children}
    </p>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    paid: { label: "پرداخت‌شده", tone: "bg-accent text-[#41525f]" },
    pending: { label: "در انتظار", tone: "border border-line text-ink-muted" },
    failed: { label: "ناموفق", tone: "border border-line text-ink-muted" },
    canceled: { label: "لغو‌شده", tone: "border border-line text-ink-muted" },
  };
  const item = map[status] ?? map.pending;
  return <span className={`type-utility px-2 py-1 !text-inherit ${item.tone}`}>{item.label}</span>;
}
