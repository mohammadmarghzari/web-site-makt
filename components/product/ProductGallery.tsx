"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { FigurePlaceholder } from "./FigurePlaceholder";
import { toFa, toFaPadded } from "@/lib/format";

/**
 * Product image gallery.
 *
 * Falls back to the vector placeholder when a product has no photography yet,
 * so a freshly added product never renders as a broken image.
 */
export function ProductGallery({
  product,
  discount,
}: {
  product: Product;
  discount: number | null;
}) {
  const [active, setActive] = useState(0);
  const soldOut = product.status === "sold_out" || product.stock === 0;
  const images = product.images;
  const current = images[active];

  return (
    <div>
      <div
        className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-panel"
        style={{ borderRadius: "var(--radius)" }}
      >
        {current ? (
          <Image
            src={current}
            alt={product.name_fa}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-10">
            <FigurePlaceholder seed={product.slug} className="h-full w-auto" />
          </div>
        )}

        <div className="absolute top-3 flex flex-col gap-1" style={{ insetInlineStart: "0.75rem" }}>
          {soldOut && (
            <span className="type-utility bg-bg-deep/80 px-2 py-1 !text-ink">ناموجود</span>
          )}
          {!soldOut && discount !== null && (
            <span className="type-utility bg-accent px-2 py-1 !text-[#41525f]">
              ٪{toFa(discount)}‌ تخفیف
            </span>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex items-center gap-3">
          <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((src, index) => (
              <li key={src} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-pressed={index === active}
                  aria-label={`تصویر ${toFaPadded(index + 1)}`}
                  className={[
                    "relative block h-16 w-14 overflow-hidden border transition-colors",
                    index === active ? "border-accent" : "border-line hover:border-ink-muted",
                  ].join(" ")}
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
          <span className="type-utility whitespace-nowrap">
            {toFaPadded(active + 1)} / {toFaPadded(images.length)}
          </span>
        </div>
      )}
    </div>
  );
}
