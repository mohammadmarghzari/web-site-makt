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
      duration: 1.2,
      // Exponential ease-out: fast to respond, long tail. This is what gives
      // the transitions their weight without feeling laggy to input.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.6,
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
          duration: 1.4,
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
