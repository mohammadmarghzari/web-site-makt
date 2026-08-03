"use client";

import { useStageProgress } from "./ScrollStage";
import { useScrollController } from "./SmoothScroll";
import { toFaPadded } from "@/lib/format";

/*
 * Vertical act indicator.
 *
 * The brief places this on the left of the screen. Under `dir="rtl"` the
 * *end* edge is the left one, so `inset-inline-end` is what puts it there —
 * and it keeps doing the right thing if a locale ever runs left-to-right,
 * which a hard-coded `left` would not.
 */

const ACTS: { id: string; label: string }[] = [
  { id: "act-1", label: "معرفی" },
  { id: "act-2", label: "کاتالوگ" },
  { id: "act-3", label: "مانیفست" },
];

export function ProgressRail() {
  const { activeIndex } = useStageProgress();
  const controller = useScrollController();

  return (
    <nav
      aria-label="پرده‌های صفحه"
      className="pointer-events-none fixed top-1/2 z-50 hidden -translate-y-1/2 md:block"
      style={{ insetInlineEnd: "calc(var(--frame-inset) + 12px)" }}
    >
      <ol className="pointer-events-auto flex flex-col gap-5">
        {ACTS.map((act, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={act.id}>
              <button
                type="button"
                onClick={() => controller.scrollTo(`#${act.id}`)}
                aria-current={isActive ? "true" : undefined}
                // Reversed so the dot sits nearest the screen edge and the
                // label reads inward; plain `flex` in RTL would put the label
                // against the edge and push the dot away from it.
                className="group flex flex-row-reverse items-center gap-2.5 text-start"
              >
                <span
                  aria-hidden="true"
                  className={[
                    "block h-1.5 w-1.5 rounded-full transition-all duration-500",
                    isActive
                      ? "scale-125 bg-accent"
                      : "bg-ink-muted/45 group-hover:bg-ink-muted",
                  ].join(" ")}
                />
                <span
                  className={[
                    "type-utility transition-opacity duration-500",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-70",
                  ].join(" ")}
                >
                  {toFaPadded(index + 1)} {act.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
