"use client";

import type { HeroScene } from "@/lib/types";
import { useActMotion } from "@/components/scroll/ScrollStage";
import { HeroMotion } from "./HeroMotion";
import { Bracket } from "@/components/ui/Bracket";
import { ButtonLink } from "@/components/ui/Button";

/*
 * Act 3 — the brand manifesto.
 *
 * Same motion machinery as Act 1, but the copy carries the weight and the
 * layout is deliberately emptier. The procedural sequence runs at a different
 * phase so the two hero acts never look like the same shot reused.
 */
export function Act3Hero({ scene }: { scene: HeroScene }) {
  const { scrub, frozen } = useActMotion();
  return (
    <div className="relative h-full w-full">
      <HeroMotion
        frames={scene.frames}
        posterUrl={scene.poster_url}
        overlayAlpha={scene.overlay_alpha}
        scrub={scrub}
        frozen={frozen}
        phase={0.5}
      />

      {/* Matching gutter for ProgressRail; see Act1Hero. */}
      <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-8 md:pe-24">
        <header className="flex items-start justify-between gap-4">
          <Bracket>مانیفست</Bracket>
          <span className="type-utility" dir="ltr">
            EST. 1405
          </span>
        </header>

        <div className="max-w-3xl">
          <h2 className="type-display text-[16vw] leading-[0.88] sm:text-[12vw] lg:text-[8vw]">
            {scene.title_lines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-muted">
            {scene.subtitle_fa}
          </p>
          {scene.cta_label && scene.cta_href && (
            <div className="mt-8">
              <ButtonLink href={scene.cta_href} tone="outline">
                {scene.cta_label}
              </ButtonLink>
            </div>
          )}
        </div>

        <footer className="flex items-end justify-between gap-4">
          <Bracket>ساخت ایران</Bracket>
          <span className="type-utility" dir="ltr">
            1/12 SCALE
          </span>
        </footer>
      </div>
    </div>
  );
}
