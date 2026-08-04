"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue } from "motion/react";
import { SequenceCanvas } from "@/components/hero/SequenceCanvas";
import { createProceduralSource } from "@/lib/sequence/proceduralSource";
import { createUrlSource } from "@/lib/sequence/urlSource";
import type { FrameSource } from "@/lib/sequence/types";
import { toFa } from "@/lib/format";

/*
 * Live preview of a hero act.
 *
 * Uses the same SequenceCanvas the real site uses, fed by the same frame
 * sources, so what is approved here is genuinely what ships. What it does
 * *not* reuse is the scroll engine: inside a small panel there is no scroll
 * position to derive from, so a slider stands in for the playhead. That makes
 * it easy to check any single frame — awkward with real scrolling.
 */
export function ScenePreview({
  titleLines,
  subtitle,
  ctaLabel,
  overlayAlpha,
  frames,
  poster,
}: {
  titleLines: string[];
  subtitle: string;
  ctaLabel: string;
  overlayAlpha: number;
  frames: string[];
  poster: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState(0);
  const progress = useMotionValue(0);

  useEffect(() => setMounted(true), []);
  useEffect(() => progress.set(position), [position, progress]);

  const source = useMemo<FrameSource | null>(() => {
    if (!mounted) return null;
    if (frames.length > 0) return createUrlSource({ frames });
    return createProceduralSource({ count: 48, width: 720, height: 900 });
  }, [mounted, frames]);

  useEffect(() => () => source?.dispose(), [source]);

  return (
    <div>
      <div
        className="relative aspect-[3/4] overflow-hidden border border-line bg-bg"
        style={{ borderRadius: "var(--radius)" }}
      >
        {source ? (
          <SequenceCanvas source={source} progress={progress} className="h-full w-full" />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview only; the URL is arbitrary user-supplied storage
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-panel" />
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, rgba(65,82,95,${Math.min(1, overlayAlpha + 0.25)}) 0%, rgba(65,82,95,${overlayAlpha}) 55%, rgba(65,82,95,${Math.max(0, overlayAlpha - 0.15)}) 100%)`,
          }}
        />

        <motion.div className="absolute inset-0 flex flex-col justify-end p-4">
          <h3 className="type-display text-[9vw] leading-[0.9] sm:text-3xl">
            {titleLines.length > 0 ? (
              titleLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))
            ) : (
              <span className="block opacity-40">تیتر خالی است</span>
            )}
          </h3>
          {subtitle && (
            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
              {subtitle}
            </p>
          )}
          {ctaLabel && (
            <span className="type-utility mt-3 inline-flex w-fit border border-line px-2 py-1 !text-ink">
              {ctaLabel}
            </span>
          )}
        </motion.div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="type-utility">موقعیت اسکرول</span>
          <span className="type-utility !text-ink">{toFa(Math.round(position * 100))}٪</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          aria-label="جابه‌جایی بین فریم‌ها"
          className="mt-2 w-full accent-[#E4EDF2]"
        />
        <p className="type-utility mt-1.5">
          {frames.length > 0
            ? `${toFa(frames.length)} فریم آپلودشده`
            : "فریمی آپلود نشده — تصویر تولیدی پیش‌فرض"}
        </p>
      </div>
    </div>
  );
}
