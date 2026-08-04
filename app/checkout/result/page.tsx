import type { Metadata } from "next";
import Link from "next/link";
import { getOrderById } from "@/lib/repo/orders";
import { getSettings } from "@/lib/repo/settings";
import { formatToman, toFa } from "@/lib/format";
import { Bracket } from "@/components/ui/Bracket";
import { ButtonLink } from "@/components/ui/Button";
import { Footer } from "@/components/ui/Footer";
import { FrameOverlay } from "@/components/ui/FrameOverlay";

export const metadata: Metadata = {
  title: "نتیجهٔ پرداخت",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/*
 * Payment receipt.
 *
 * Reads the order fresh on every request rather than trusting the query
 * string: the URL says which order to show, but the database says whether it
 * was actually paid. Someone hand-typing `?state=paid` sees the real status.
 */
export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; order?: string; reason?: string }>;
}) {
  const { state = "failed", order: orderId, reason } = await searchParams;
  const [order, settings] = await Promise.all([
    orderId ? getOrderById(orderId) : Promise.resolve(null),
    getSettings(),
  ]);

  const paid = order?.status === "paid";
  const canceled = state === "canceled";

  const heading = paid ? "پرداخت انجام شد" : canceled ? "پرداخت لغو شد" : "پرداخت ناموفق بود";

  const body = paid
    ? "سفارش شما ثبت شد. شمارهٔ پیگیری را نگه دارید — برای هماهنگی ارسال با شما تماس می‌گیریم."
    : canceled
      ? "تراکنش را لغو کردید و مبلغی کم نشده است. اگر پشیمان شدید، سبد خرید هنوز سر جایش است."
      : (reason ?? "تراکنش کامل نشد. اگر مبلغی کم شده باشد، طی ۷۲ ساعت به حسابتان برمی‌گردد.");

  return (
    <>
      <FrameOverlay />
      <main className="relative z-10 flex min-h-[80dvh] items-center px-4 py-16 sm:px-8">
        <div className="mx-auto w-full max-w-lg">
          <Bracket>نتیجهٔ پرداخت</Bracket>
          <h1 className="type-display mt-4 text-4xl sm:text-5xl">{heading}</h1>
          <p className="mt-5 text-sm leading-relaxed text-ink-muted">{body}</p>

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

              {paid && order.ref_id && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">شمارهٔ پیگیری</dt>
                  <dd className="text-ink" dir="ltr">
                    {order.ref_id}
                  </dd>
                </div>
              )}

              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="text-ink-muted">مبلغ</dt>
                <dd className="text-ink">{formatToman(order.total)}</dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">تعداد اقلام</dt>
                <dd className="text-ink">
                  {toFa(order.items.reduce((sum, item) => sum + item.quantity, 0))}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <ButtonLink href="/">بازگشت به فروشگاه</ButtonLink>
            {!paid && (
              <Link href="/cart" className="type-utility transition-colors hover:!text-accent">
                بازگشت به سبد
              </Link>
            )}
          </div>
        </div>
      </main>

      <div className="relative z-10 px-4 sm:px-8">
        <Footer settings={settings} />
      </div>
    </>
  );
}
