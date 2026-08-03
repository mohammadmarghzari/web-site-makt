"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * True when the visitor has asked the OS to reduce motion.
 *
 * Every scroll-driven effect in this project checks this: smooth scrolling is
 * left off entirely, frame scrubbing is disabled in favour of a single static
 * frame, and act transitions become instant rather than animated.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * True on phones and touch devices, where a full-viewport backdrop blur is too
 * expensive to run every frame. Callers drop blur from the crossfade and fall
 * back to opacity and scale alone.
 */
export function useReducedEffects(): boolean {
  const coarse = useMediaQuery("(max-width: 767px), (pointer: coarse)");
  const reduced = usePrefersReducedMotion();
  return coarse || reduced;
}
