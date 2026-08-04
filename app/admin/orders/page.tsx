import { listOrders } from "@/lib/repo/orders";
import { hasServiceRole } from "@/lib/supabase/env";
import { formatToman, toFa } from "@/lib/format";
import { Bracket } from "@/components/ui/Bracket";
import { OrderStatusBadge } from "@/app/admin/page";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listOrders(100);

  return (
    <div>
      <Bracket>سفارش‌ها</Bracket>
      <h1 className="type-display mt-2 text-3xl">سفارش‌ها</h1>

      {!hasServiceRole() && (
        <p
          className="mt-5 border border-accent/50 px-4 py-3 text-[13px] leading-relaxed text-ink"
          style={{ borderRadius: "var(--radius)" }}
        >
          <code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code> تنظیم نشده، پس سفارش‌ها فقط در
          حافظهٔ سرور می‌مانند و با ری‌استارت پاک می‌شوند.
        </p>
      )}

      {orders.length === 0 ? (
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
                <OrderStatusBadge status={order.status} />
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
                <Row label="مشتری" value={order.customer.name} />
                <Row label="موبایل" value={order.customer.phone} ltr />
                <Row label="کد پستی" value={order.customer.postal_code} ltr />
                <Row label="مبلغ" value={formatToman(order.total)} />
                {order.ref_id && <Row label="شمارهٔ پیگیری" value={order.ref_id} ltr />}
                <Row
                  label="تاریخ"
                  value={new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(order.created_at))}
                />
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
                  <li key={`${item.product_id}-${index}`} className="flex justify-between gap-3 text-[13px]">
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
