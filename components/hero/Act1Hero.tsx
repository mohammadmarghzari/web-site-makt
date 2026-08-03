"use client";

import { useState } from "react";
import type { HeroScene, Product } from "@/lib/types";
import { useActMotion } from "@/components/scroll/ScrollStage";
import { HeroMotion } from "./HeroMotion";
import { ThumbRail } from "./ThumbRail";
import { Bracket } from "@/components/ui/Bracket";
import { ButtonLink } from "@/components/ui/Button";
import { ColorSwatchPicker } from "@/components/product/ColorSwatch";
import { formatToman, toFa } from "@/lib/format";

/*
 * Act 1 — the featured figure.
 *
 * Headline lines come from the scene record as an array, one entry per line,
 * because the display type is hand-broken: automatic wrapping would ruin the
 * shape of a three-line mass set at 0.9 line-height.
 */
export function Act1Hero({ scene, products }: { scene: HeroScene; products: Product[] }) {
  const { scrub, frozen } = useActMotion();
  const [activeSlug, setActiveSlug] = useState(
    products.find((p) => p.is_featured)?.slug ?? products[0]?.slug ?? "",
  );
  const active = products.find((p) => p.slug === activeSlug) ?? products[0];
  const [selectedColor, setSelectedColor] = useState(active?.colors[0]?.hex ?? "");

  const handleSelect = (slug: string) => {
    setActiveSlug(slug);
    const next = products.find((p) => p.slug === slug);
    setSelectedColor(next?.colors[0]?.hex ?? "");
  };

  const soldOut = active ? active.status === "sold_out" || active.stock === 0 : false;

  return (
    <div className="relative h-full w-full">
      <HeroMotion
        frames={scene.frames}
        posterUrl={scene.poster_url}
        overlayAlpha={scene.overlay_alpha}
        scrub={scrub}
        frozen={frozen}
      />

      {/* `pe` on md+ reserves the gutter ProgressRail occupies — under RTL the
          inline-end edge is the left one, where the rail is anchored. */}
      <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-8 md:pe-24">
        <header className="flex items-start justify-between gap-4">
          <Bracket>فیگور شاخص</Bracket>
          <span className="type-utility" dir="ltr">
            MAKT
          </span>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="type-display text-[15vw] leading-[0.88] sm:text-[11vw] lg:text-[7.5vw]">
              {scene.title_lines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
              {scene.subtitle_fa}
            </p>

            <div className="mt-6 hidden sm:block">
              <ThumbRail products={products} activeSlug={activeSlug} onSelect={handleSelect} />
            </div>
          </div>

          {active && (
            <aside className="w-full border border-line bg-bg-deep/35 p-4 backdrop-blur-[2px] lg:w-72">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="type-utility !text-ink">{active.name_fa}</h2>
                <span className="type-utility opacity-65" dir="ltr">
                  {active.name_en}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                {active.tagline_fa}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-y-2 border-t border-line pt-4">
                <dt className="type-utility">مقیاس</dt>
                <dd className="type-utility !text-ink text-end" dir="ltr">
                  {active.scale}
                </dd>
                <dt className="type-utility">قد</dt>
                <dd className="type-utility !text-ink text-end">
                  {toFa(active.height_cm)} سانتی‌متر
                </dd>
                {active.articulation !== null && (
                  <>
                    <dt className="type-utility">مفصل</dt>
                    <dd className="type-utility !text-ink text-end">
                      {toFa(active.articulation)} نقطه
                    </dd>
                  </>
                )}
              </dl>

              {active.colors.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  <Bracket className="mb-2.5 block">رنگ</Bracket>
                  <ColorSwatchPicker
                    colors={active.colors}
                    selected={selectedColor}
                    onSelect={setSelectedColor}
                  />
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                <span className={`text-[13px] ${soldOut ? "text-ink-muted line-through" : "text-ink"}`}>
                  {formatToman(active.price)}
                </span>
                {soldOut ? (
                  <span className="type-utility">ناموجود</span>
                ) : (
                  <ButtonLink href={scene.cta_href ?? `/product/${active.slug}`}>
                    {scene.cta_label ?? "خرید"}
                  </ButtonLink>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
