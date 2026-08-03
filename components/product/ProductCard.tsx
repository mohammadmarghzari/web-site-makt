import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent, formatToman, toFa } from "@/lib/format";
import { ColorSwatchRow } from "./ColorSwatch";
import { FigurePlaceholder } from "./FigurePlaceholder";

/*
 * Catalogue card, following the reference layout exactly:
 *
 *   image  ──────────────
 *   name          (small, wide-tracked)
 *   one-line tagline  (muted)
 *   ● ● ●  colours
 *   price
 *
 * Hover raises the card to `--panel-hi` and scales the image by 3%. No
 * shadow, no lift, no extra effect — the reference is emphatic about that.
 */
export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.status === "sold_out" || product.stock === 0;
  const discount = discountPercent(product.price, product.compare_price);
  const cover = product.images[0];

  return (
    <article className="group">
      <Link
        href={`/product/${product.slug}`}
        className="block bg-panel transition-colors duration-500 hover:bg-panel-hi"
        style={{ borderRadius: "var(--radius)" }}
        aria-label={`${product.name_fa} — ${formatToman(product.price)}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
          {cover ? (
            <Image
              src={cover}
              alt={product.name_fa}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 transition-transform duration-700 ease-out group-hover:scale-[1.03]">
              <FigurePlaceholder seed={product.slug} className="h-full w-auto" />
            </div>
          )}

          {/* Status flags sit top-start so they never collide with the price. */}
          <div className="absolute top-2 flex flex-col gap-1" style={{ insetInlineStart: "0.5rem" }}>
            {soldOut && (
              <span className="type-utility bg-bg-deep/80 px-2 py-1 !text-ink">ناموجود</span>
            )}
            {!soldOut && discount !== null && (
              <span className="type-utility bg-accent px-2 py-1 !text-[#41525f]">
                ٪{toFa(discount)}‌ تخفیف
              </span>
            )}
            {!soldOut && product.stock > 0 && product.stock <= 3 && (
              <span className="type-utility bg-bg-deep/80 px-2 py-1 !text-ink">
                تنها {toFa(product.stock)} عدد
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-line px-3 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="type-utility !text-ink">{product.name_fa}</h3>
            <span className="type-utility opacity-60" dir="ltr">
              {product.name_en}
            </span>
          </div>

          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{product.tagline_fa}</p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <ColorSwatchRow colors={product.colors} />
            <div className="text-end">
              {discount !== null && product.compare_price && (
                <div className="type-utility line-through opacity-55">
                  {toFa(product.compare_price)}
                </div>
              )}
              <div className={`text-[13px] ${soldOut ? "text-ink-muted line-through" : "text-ink"}`}>
                {formatToman(product.price)}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
