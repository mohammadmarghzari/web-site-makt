"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart/CartProvider";
import { ColorSwatchPicker } from "./ColorSwatch";
import { Button } from "@/components/ui/Button";
import { Bracket } from "@/components/ui/Bracket";
import { discountPercent, formatToman, toFa } from "@/lib/format";

/**
 * Colour selection, quantity and add-to-cart.
 *
 * Quantity is capped at the remaining stock so the customer cannot build a
 * basket that checkout will then reject — the server re-checks anyway, but
 * failing here is far kinder than failing after they have entered an address.
 */
export function ProductBuyPanel({ product }: { product: Product }) {
  const { add } = useCart();
  const [colorHex, setColorHex] = useState(product.colors[0]?.hex ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const soldOut = product.status === "sold_out" || product.stock === 0;
  const discount = discountPercent(product.price, product.compare_price);
  const maxQuantity = Math.max(1, Math.min(10, product.stock));

  const handleAdd = () => {
    const color = product.colors.find((c) => c.hex === colorHex) ?? null;
    add(
      {
        product_id: product.id,
        slug: product.slug,
        name_fa: product.name_fa,
        price: product.price,
        color_hex: color?.hex ?? null,
        color_name_fa: color?.name_fa ?? null,
        image: product.images[0] ?? null,
      },
      quantity,
    );
    setAdded(true);
  };

  return (
    <div className="mt-8 border-t border-line pt-6">
      {product.colors.length > 0 && (
        <div className="mb-6">
          <Bracket className="mb-3 block">رنگ</Bracket>
          <ColorSwatchPicker
            colors={product.colors}
            selected={colorHex}
            onSelect={(hex) => {
              setColorHex(hex);
              setAdded(false);
            }}
          />
        </div>
      )}

      {!soldOut && (
        <div className="mb-6 flex items-center gap-4">
          <Bracket>تعداد</Bracket>
          <div className="flex items-center border border-line" style={{ borderRadius: "var(--radius)" }}>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="کاهش تعداد"
              className="px-3 py-1.5 text-ink transition-colors hover:text-accent disabled:opacity-35"
            >
              −
            </button>
            <span className="min-w-9 text-center text-sm" aria-live="polite">
              {toFa(quantity)}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              aria-label="افزایش تعداد"
              className="px-3 py-1.5 text-ink transition-colors hover:text-accent disabled:opacity-35"
            >
              +
            </button>
          </div>
          {product.stock <= 3 && (
            <span className="type-utility">تنها {toFa(product.stock)} عدد مانده</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {discount !== null && product.compare_price && (
            <div className="type-utility line-through opacity-60">
              {toFa(product.compare_price)}
            </div>
          )}
          <div className={`text-lg ${soldOut ? "text-ink-muted line-through" : "text-ink"}`}>
            {formatToman(product.price)}
          </div>
        </div>

        {soldOut ? (
          <span className="type-utility">فعلاً موجود نیست</span>
        ) : (
          <Button onClick={handleAdd}>افزودن به سبد</Button>
        )}
      </div>

      {added && (
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-line px-4 py-3"
          style={{ borderRadius: "var(--radius)" }}
          role="status"
        >
          <span className="text-[13px] text-ink">به سبد اضافه شد</span>
          <Link href="/cart" className="type-utility !text-accent hover:underline">
            رفتن به سبد ←
          </Link>
        </div>
      )}
    </div>
  );
}
