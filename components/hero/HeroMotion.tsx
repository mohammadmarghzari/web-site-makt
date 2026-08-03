"use client";

import { useEffect, useMemo, useState } from "react";
import type { MotionValue } from "motion/react";
import { SequenceCanvas } from "./SequenceCanvas";
import { createProceduralSource } from "@/lib/sequence/proceduralSource";
import { createUrlSource } from "@/lib/sequence/urlSource";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { FrameSource } from "@/lib/sequence/types";

/*
 * The scroll-driven backdrop of a hero act.
 *
 * Picks a frame source and a frame count, then hands both to the canvas
 * renderer. Everything that depends on the viewport is decided here so the
 * renderer stays a dumb, fast draw loop.
 *
 * Frame budget: 96 on desktop, 48 on phones. The sequence carries real weight
 * — roughly 40 KB per WebP frame once real photography replaces the
 * procedural stand-in — and halving it on mobile is the single biggest lever
 * on that cost.
 */

const DESKTOP_FRAMES = 96;
const MOBILE_FRAMES = 48;

export function HeroMotion({
  frames,
  posterUrl,
  overlayAlpha,
  scrub,
  frozen,
  phase = 0,
}: {
  /** Real frame URLs. Empty in phases 1–2, which selects the procedural source. */
  frames: string[];
  posterUrl: string | null;
  overlayAlpha: number;
  scrub: MotionValue<number>;
  frozen: boolean;
  /** Offsets the procedural rotation so the two hero acts differ. */
  phase?: number;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  // Frame sources touch the DOM, so they cannot be built during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const source = useMemo<FrameSource | null>(() => {
    if (!mounted) return null;
    if (frames.length > 0) return createUrlSource({ frames });

    const count = isMobile ? MOBILE_FRAMES : DESKTOP_FRAMES;
    // Render at a modest resolution and let the canvas scale it up: the
    // procedural artwork is flat vector shapes, so upscaling costs nothing
    // visually and keeps the offscreen memory small.
    return createProceduralSource({
      count,
      width: isMobile ? 720 : 1280,
      height: isMobile ? 1280 : 800,
      phase,
    });
  }, [mounted, frames, isMobile, phase]);

  useEffect(() => () => source?.dispose(), [source]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {source ? (
        <SequenceCanvas source={source} progress={scrub} frozen={frozen} className="h-full w-full" />
      ) : (
        // Server render and first paint: the poster if one exists, otherwise a
        // flat slate field. Never a blank white flash.
        <div
          className="h-full w-full bg-bg"
          style={
            posterUrl
              ? { backgroundImage: `url(${posterUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
      )}

      {/* Contrast scrim. Text over a moving image needs a floor on contrast,
          and the admin controls its strength per scene. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, rgba(65,82,95,${Math.min(1, overlayAlpha + 0.25)}) 0%, rgba(65,82,95,${overlayAlpha}) 55%, rgba(65,82,95,${Math.max(0, overlayAlpha - 0.15)}) 100%)`,
        }}
      />
    </div>
  );
}
