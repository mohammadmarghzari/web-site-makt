"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import type { FrameSource } from "@/lib/sequence/types";

/*
 * Renders a scroll-driven image sequence into a single <canvas>.
 *
 * Why canvas rather than swapping <img> elements: changing `src` or toggling
 * `display` across dozens of images forces layout and paint work on every
 * scrub, which shows up as flicker. A canvas is one composited layer and
 * `drawImage` is effectively free once the frame is decoded.
 *
 * Scroll progress arrives as a MotionValue and is consumed *outside* React —
 * `useMotionValueEvent` writes to a ref and schedules a single rAF. No state
 * updates, so nothing re-renders at frame rate.
 */

/** Beyond 2x, the extra fill cost buys nothing visible. */
const MAX_DPR = 2;

export interface SequenceCanvasProps {
  source: FrameSource;
  /** Normalised playhead, 0 → 1. */
  progress: MotionValue<number>;
  /** When true the sequence pins to frame 0 and ignores scroll (reduced motion). */
  frozen?: boolean;
  className?: string;
}

export function SequenceCanvas({
  source,
  progress,
  frozen = false,
  className,
}: SequenceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetFrame = useRef(0);
  const rafId = useRef<number | null>(null);
  /** Set by the mount effect; the scroll handler calls it without owning it. */
  const scheduleRef = useRef<() => void>(() => {});

  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let size = { w: 0, h: 0 };
    let cancelled = false;

    const draw = () => {
      rafId.current = null;
      const image = sourceRef.current.get(targetFrame.current);
      if (!image || size.w === 0 || size.h === 0) return;

      const iw = Number((image as { width?: number }).width ?? 0);
      const ih = Number((image as { height?: number }).height ?? 0);
      if (!iw || !ih) return;

      // object-fit: cover, computed by hand — canvas has no CSS equivalent.
      const scale = Math.max(size.w / iw, size.h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(image, (size.w - dw) / 2, (size.h - dh) / 2, dw, dh);
    };

    const schedule = () => {
      if (rafId.current !== null) return;
      rafId.current = requestAnimationFrame(draw);
    };
    scheduleRef.current = schedule;

    // Back the canvas with device pixels, then scale the context so every
    // drawing calculation above stays in CSS pixels.
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = { w, h };
      schedule();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Paint as soon as the coarse pass lands. Until then `get()` returns the
    // nearest available frame, so there is never a blank canvas after this.
    void sourceRef.current.ready.then(() => {
      if (cancelled) return;
      schedule();
    });

    return () => {
      cancelled = true;
      scheduleRef.current = () => {};
      observer.disconnect();
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
  }, []);

  useMotionValueEvent(progress, "change", (value) => {
    if (frozen) return;
    const src = sourceRef.current;
    const clamped = value < 0 ? 0 : value > 1 ? 1 : value;
    const index = Math.round(clamped * (src.count - 1));
    if (index === targetFrame.current) return;
    targetFrame.current = index;

    // Preload asymmetrically — more ahead of the playhead than behind, because
    // scrolling forward is the common case.
    src.ensure(index - 4, index + 8);
    scheduleRef.current();
  });

  // Reduced motion: pin to frame 0 and repaint once.
  useEffect(() => {
    if (!frozen) return;
    targetFrame.current = 0;
    void sourceRef.current.ready.then(() => scheduleRef.current());
  }, [frozen]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      // Decorative — the headline alongside carries the meaning.
      aria-hidden="true"
    />
  );
}
