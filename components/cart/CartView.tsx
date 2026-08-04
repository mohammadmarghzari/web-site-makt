"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { lineKey } from "@/lib/cart/types";
import { FigurePlaceholder } from "@/components/product/FigurePlaceholder";
import { Bracket } from "@/components/ui/Bracket";
import { ButtonLink } from "@/components/ui/Button";
import { formatToman, toFa } from "@/lib/format";

/**
 * Cart contents.
 *
 * The totals shown here are the client's own arithmetic and are explicitly
 * provisional — checkout re-prices everything from the database. They exist so
 * the customer can see roughly what they are committing to, not to be trusted.
 */
export function CartView({ shippingFlatPrice }: { shippingFlatPrice: number }) {
  const { lines, subtotal, setQuantity, remove, hydrated } = useCart();

  // Rendering an "empty cart" message before localStorage has been read would
  // flash the wrong state on every load for anyone who has items.
  if (!hydrated) {
    return <div className="min-h-[40dvh]" aria-hidden="true" />;
  }

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center">
        <Bracket>سبد خرید</Bracket>
        <p className="type-display text-3xl">سبد خالی است</p>
        <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">
          هنوز فیگوری انتخاب نکرده‌اید. از کاتالوگ شروع کنید.
        </p>
        <ButtonLink href="/#act-2" tone="outline">
          دیدن کاتالوگ
        </ButtonLink>
      </div>
    );
  }

  const total = subtotal + shippingFlatPrice;

  return (
    <>
      <nav className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="type-utility transition-colors hover:!text-accent">
          ← ادامهٔ خرید
        </Link>
        <Bracket>سبد خرید</Bracket>
      </nav>

      <h1 className="type-display text-4xl sm:text-5xl">سبد خرید</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => {
            const key = lineKey(line);
            return (
              <li key={key} className="flex gap-4 py-5">
                <Link
                  href={`/product/${line.slug}`}
                  className="relative h-24 w-20 shrink-0 overflow-hidden bg-panel"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  {line.image ? (
                    <Image src={line.image} alt={line.name_fa} fill sizes="80px" className="object-cover" />
                  ) : (
                    <FigurePlaceholder seed={line.slug} className="h-full w-full p-2" />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${line.slug}`}
                        className="type-utility !text-ink hover:!text-accent"
                      >
                        {line.name_fa}
                      </Link>
                      {line.color_name_fa && (
                        <p className="type-utility mt-1 flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="inline-block h-2.5 w-2.5 rounded-full border border-line"
                            style={{ backgroundColor: line.color_hex ?? undefined }}
                          />
                          {line.color_name_fa}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      className="type-utility shrink-0 transition-colors hover:!text-accent"
                    >
                      حذف
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                      className="flex items-center border border-line"
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <button
                        type="button"
                        onClick={() => setQuantity(key, line.quantity - 1)}
                        aria-label={`کاهش تعداد ${line.name_fa}`}
                        className="px-3 py-1 text-ink transition-colors hover:text-accent"
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center text-sm">{toFa(line.quantity)}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(key, line.quantity + 1)}
                        aria-label={`افزایش تعداد ${line.name_fa}`}
                        className="px-3 py-1 text-ink transition-colors hover:text-accent"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[13px] text-ink">
                      {formatToman(line.price * line.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside
          className="border border-line p-5 lg:sticky lg:top-6"
          style={{ borderRadius: "var(--radius)" }}
        >
          <Bracket>خلاصهٔ سفارش</Bracket>

          <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">جمع کالاها</dt>
              <dd className="text-ink">{formatToman(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">هزینهٔ ارسال</dt>
              <dd className="text-ink">
                {shippingFlatPrice > 0 ? formatToman(shippingFlatPrice) : "رایگان"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex justify-between border-t border-line pt-4">
            <span className="type-utility !text-ink">مبلغ نهایی</span>
            <span className="text-base text-ink">{formatToman(total)}</span>
          </div>

          <p className="type-utility mt-3 leading-relaxed">
            مبلغ نهایی هنگام ثبت سفارش دوباره از روی قیمت روز محاسبه می‌شود.
          </p>

          <div className="mt-6">
            <ButtonLink href="/checkout">ادامه و ثبت سفارش</ButtonLink>
          </div>
        </aside>
      </div>
    </>
  );
}
