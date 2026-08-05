"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/*
 * Smooth scrolling, plus the keyboard navigation Lenis does not provide.
 *
 * Lenis drives the native window scroll position, which is what makes
 * `position: sticky` and Motion's `useScroll` keep working unchanged — a
 * transform-based smooth-scroll library would break both.
 *
 * When the visitor prefers reduced motion, Lenis is never constructed at all.
 * Native scrolling then applies and every act transition becomes instant,
 * which is the honest interpretation of the preference.
 */

interface ScrollController {
  /** Scroll to an element or absolute offset, respecting the motion preference. */
  scrollTo(target: string | number | HTMLElement, options?: { immediate?: boolean }): void;
}

const ScrollContext = createContext<ScrollController | null>(null);

export function useScrollController(): ScrollController {
  const ctx = useContext(ScrollContext);
  // Falling back to native scrolling keeps components usable outside the
  // provider (and during reduced-motion renders) without null checks.
  return (
    ctx ?? {
      scrollTo(target) {
        if (typeof window === "undefined") return;
        if (typeof target === "number") {
          window.scrollTo({ top: target, behavior: "auto" });
        } else {
          const el = typeof target === "string" ? document.querySelector(target) : target;
          el?.scrollIntoView({ behavior: "auto", block: "start" });
        }
      },
    }
  );
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);
  const [controller, setController] = useState<ScrollController | null>(null);

  useEffect(() => {
    if (reduced) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      setController(null);
      return;
    }

    const lenis = new Lenis({
      // Longer glide than the usual 1.2. The acts are full-viewport panels, and
      // a short settle makes a whole screen of content arrive abruptly; the
      // extra weight is what the transitions are trading on.
      duration: 1.6,
      // Exponential ease-out: immediate response to input, long soft tail.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Slightly under 1 so a single wheel notch or flick travels less and the
      // act transitions are crossed deliberately rather than skipped past.
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
      // Cancelling inertia at the ends stops the rubber-band overshoot that
      // reports scroll positions outside [0,1] and flickers the first and
      // last act.
      syncTouch: false,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    // Lenis owns the scroll position, so nothing outside it can set the page
    // to an exact offset. Exposing the instance gives end-to-end checks — and
    // manual debugging — a deterministic way to drive the page.
    (window as unknown as { __maktScroll?: Lenis }).__maktScroll = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    setController({
      scrollTo(target, options) {
        lenis.scrollTo(target as never, {
          immediate: options?.immediate ?? false,
          // A rail click crosses a whole act, so it is given longer than a
          // wheel gesture — a jump this large at normal speed reads as a cut.
          duration: 2.0,
        });
      },
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __maktScroll?: Lenis }).__maktScroll;
    };
  }, [reduced]);

  // Keyboard navigation. Lenis intercepts wheel and touch but leaves keys to
  // the browser, which would jump instantly and bypass the smoothing — so the
  // standard scroll keys are handled explicitly here.
  useEffect(() => {
    if (reduced) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const lenis = lenisRef.current;
      if (!lenis) return;

      // Never hijack keys aimed at a form field or an editable region.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const viewport = window.innerHeight;
      const current = window.scrollY;
      let destination: number | null = null;

      switch (event.key) {
        case "PageDown":
          destination = current + viewport * 0.9;
          break;
        case "PageUp":
          destination = current - viewport * 0.9;
          break;
        case "Home":
          destination = 0;
          break;
        case "End":
          destination = document.documentElement.scrollHeight;
          break;
        case "ArrowDown":
          destination = current + viewport * 0.25;
          break;
        case "ArrowUp":
          destination = current - viewport * 0.25;
          break;
        case " ":
          // Space scrolls only when it is not activating a focused control.
          if (target && ["BUTTON", "A"].includes(target.tagName)) return;
          destination = current + viewport * (event.shiftKey ? -0.9 : 0.9);
          break;
        default:
          return;
      }

      event.preventDefault();
      lenis.scrollTo(destination, { duration: 1.0 });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reduced]);

  return <ScrollContext.Provider value={controller}>{children}</ScrollContext.Provider>;
}
