"use client";

import type { Product } from "@/lib/types";
import { FigurePlaceholder } from "@/components/product/FigurePlaceholder";
import { toFaPadded } from "@/lib/format";

/*
 * Thumbnail carousel beside the hero, with the `۰۱ ——— ۰۷` counter from the
 * reference. Horizontal scroll rather than a JS carousel: it is fewer moving
 * parts, keyboard-navigable for free, and behaves correctly under RTL without
 * any index arithmetic.
 */
export function ThumbRail({
  products,
  activeSlug,
  onSelect,
}: {
  products: Product[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}) {
  const activeIndex = Math.max(
    0,
    products.findIndex((p) => p.slug === activeSlug),
  );

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => {
          const isActive = product.slug === activeSlug;
          return (
            <li key={product.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(product.slug)}
                aria-pressed={isActive}
                aria-label={product.name_fa}
                className={[
                  "block h-14 w-12 overflow-hidden border transition-colors duration-300",
                  isActive ? "border-accent bg-panel-hi" : "border-line bg-panel/60 hover:bg-panel",
                ].join(" ")}
                style={{ borderRadius: "var(--radius)" }}
              >
                <FigurePlaceholder seed={product.slug} className="h-full w-full p-1" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <span className="type-utility">{toFaPadded(activeIndex + 1)}</span>
        <span aria-hidden="true" className="h-px w-10 bg-ink-muted/40" />
        <span className="type-utility">{toFaPadded(products.length)}</span>
      </div>
    </div>
  );
}
