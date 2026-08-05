"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  usePrefersReducedMotion,
  useReducedEffects,
} from "@/lib/hooks/usePrefersReducedMotion";

/*
 * The cinematic scroll engine.
 *
 * ── The one rule that makes it bidirectional ──────────────────────────────
 * Every visual property is a *pure function of scroll position*. There is no
 * state machine, no "has entered" flag, no one-shot trigger anywhere. Scroll
 * up and the same function is evaluated at the same input, so the animation
 * reverses exactly, at exactly the same quality. Anything trigger-based would
 * play once and look broken on the way back — that is the failure this design
 * exists to prevent.
 *
 * ── How the crossfade actually overlaps ───────────────────────────────────
 * A sticky panel unpins precisely where the next section begins, so acts do
 * not naturally overlap in time and a true crossfade is impossible. Each act
 * after the first is therefore pulled up by one viewport (`-100dvh` margin)
 * and painted above its predecessor. That negative margin *is* the transition
 * window: for exactly one viewport of scroll, both acts occupy the screen,
 * one dissolving as the other resolves.
 *
 * ── Why one shared progress value per boundary ────────────────────────────
 * Act N's exit and act N+1's entry are the same event. Measuring them
 * separately invites sub-pixel disagreement and a visible seam, so a boundary
 * is measured once — from the incoming act — and the outgoing act subtracts
 * it. They cannot drift.
 */

/** Total acts. Fixed at three for now; the data model already allows more. */
const ACT_COUNT = 3;

interface StageValue {
  /** entry[i] — how far act i has entered, 0 → 1. Act 0 is always fully in. */
  entries: MotionValue<number>[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  register: (index: number, ref: RefObject<HTMLElement | null>) => void;
  refs: RefObject<Map<number, RefObject<HTMLElement | null>>>;
}

const StageContext = createContext<StageValue | null>(null);

function useStage(): StageValue {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("Act components must be rendered inside <ScrollStage>");
  return ctx;
}

/** Public read-only view, used by ProgressRail. */
export function useStageProgress() {
  const { entries, activeIndex, refs } = useStage();
  return { entries, activeIndex, refs };
}

interface ActMotion {
  /** Frame-scrub playhead for this act, 0 → 1. */
  scrub: MotionValue<number>;
  /** True when motion is reduced: pin to one frame, no scrubbing. */
  frozen: boolean;
}

const ActMotionContext = createContext<ActMotion | null>(null);

/**
 * Read the current act's scrub playhead.
 *
 * Delivered through context rather than as a render prop because the page is a
 * Server Component: a function cannot cross the server/client boundary, but
 * children as plain JSX can.
 */
export function useActMotion(): ActMotion {
  const ctx = useContext(ActMotionContext);
  if (!ctx) throw new Error("useActMotion must be called inside <StickyAct>");
  return ctx;
}

export function ScrollStage({ children }: { children: ReactNode }) {
  // Act 0 is on screen at load, so its entry is pinned at 1 and never measured.
  const entry0 = useMotionValue(1);
  const entry1 = useMotionValue(0);
  const entry2 = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef(new Map<number, RefObject<HTMLElement | null>>());

  const entries = useMemo(() => [entry0, entry1, entry2], [entry0, entry1, entry2]);

  // Derived centrally rather than in each act: if every act nominated the
  // active index from its own handler they would overwrite one another and the
  // rail would latch onto whichever fired last.
  const syncActive = () => {
    const next = entry2.get() > 0.5 ? 2 : entry1.get() > 0.5 ? 1 : 0;
    setActiveIndex((current) => (current === next ? current : next));
  };
  useMotionValueEvent(entry1, "change", syncActive);
  useMotionValueEvent(entry2, "change", syncActive);

  const value = useMemo<StageValue>(
    () => ({
      entries,
      activeIndex,
      setActiveIndex,
      register: (index, ref) => {
        refs.current.set(index, ref);
      },
      refs,
    }),
    [entries, activeIndex],
  );

  return (
    <StageContext.Provider value={value}>
      <div className="relative">{children}</div>
    </StageContext.Provider>
  );
}

/** Smootherstep. Zero first *and* second derivative at both ends. */
function ease(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** Rescales `value` from the range [from, to] onto [0, 1], clamped. */
function remap(value: number, from: number, to: number): number {
  return Math.max(0, Math.min(1, (value - from) / (to - from)));
}

/**
 * The point at which an act being covered may finally start disappearing.
 * By here the act on top is ~99% opaque, so this fade is invisible — it exists
 * only to stop an invisible layer from staying composited forever.
 */
const HANDOVER = 0.88;

/**
 * Turns an act's position in the transition into its visual treatment.
 *
 * ── Why the outgoing act does not fade ────────────────────────────────────
 * Acts are stacked, with each one painted *over* its predecessor. If both
 * fade linearly, the midpoint has each at 50% and the composite works out to
 * 0.5 + 0.5×0.5 = 0.75 — a quarter of the page background shows straight
 * through, which reads as a wash-out or a flicker exactly where the motion
 * should feel most continuous.
 *
 * So only the incoming act animates its opacity. It dissolves in on top of a
 * predecessor that stays fully opaque underneath, and the composite never
 * drops below 1. The outgoing act still scales and blurs, so it visibly
 * recedes — it just never lets the background through.
 *
 * `presence` is how far this act has arrived; `covered` is how far the act
 * above has taken over. Both are pure functions of scroll, so the whole
 * transition still reverses exactly.
 */
function useCrossfade(
  presence: MotionValue<number>,
  covered: MotionValue<number>,
  blurMax: number,
  instant: boolean,
) {
  const inputs = [presence, covered] as MotionValue<number>[];

  // Reduced motion: a clean cut at the handover point. Both acts read the same
  // boundary value, so one vanishes exactly as the other lands.
  const opacity = useTransform(inputs, ([p, c]: number[]) => {
    if (instant) return p > 0.5 && c <= 0.5 ? 1 : 0;
    return ease(p) * (1 - ease(remap(c, HANDOVER, 1)));
  });

  // An act recedes both while arriving and while being covered, so the larger
  // of the two drives the effect.
  const recede = useTransform(inputs, ([p, c]: number[]) => Math.max(1 - p, c));

  const scale = useTransform(recede, (r) => (instant ? 1 : 1 + 0.06 * r));
  const filter = useTransform(recede, (r) =>
    blurMax === 0 || instant ? "none" : `blur(${(r * blurMax).toFixed(2)}px)`,
  );

  // An act keeps its box even at zero opacity because of the overlap margins,
  // so anything covered must stop intercepting clicks meant for the act above.
  const pointerEvents = useTransform(inputs, ([p, c]: number[]) =>
    p > 0.5 && c < 0.5 ? "auto" : "none",
  );

  return { opacity, scale, filter, pointerEvents };
}

/** Shared bookkeeping: measure this act's entry, expose its visibility. */
function useActWiring(index: number, ref: RefObject<HTMLElement | null>) {
  const { entries, register } = useStage();
  register(index, ref);

  // Entry spans exactly one viewport: from this act's top touching the bottom
  // of the screen, to it touching the top. That window is the overlap created
  // by the -100dvh margin, so entry and the previous act's exit coincide.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  const entry = entries[index];
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (index === 0) return; // act 0 is always fully entered
    entry.set(v);
  });

  const next = entries[index + 1] as MotionValue<number> | undefined;

  // The last act is never covered, so it needs a value that stays at zero
  // rather than a missing one — the transform below always reads both.
  const zero = useMotionValue(0);
  const covered = next ?? zero;

  return { presence: entry, covered, entry };
}

export interface StickyActProps {
  index: number;
  id: string;
  /**
   * Wrapper height as a multiple of the viewport. One viewport is consumed by
   * the pinned panel itself, one more by the outgoing crossfade, and the rest
   * is the scroll budget the image sequence scrubs across.
   */
  length: number;
  /** Act content; reads the playhead via `useActMotion()`. */
  children: ReactNode;
}

export function StickyAct({ index, id, length, children }: StickyActProps) {
  const wrapperRef = useRef<HTMLElement>(null);
  const { presence, covered, entry } = useActWiring(index, wrapperRef);
  const reduceEffects = useReducedEffects();
  const reducedMotion = usePrefersReducedMotion();
  const blurMax = reduceEffects ? 0 : 8;
  const { opacity, scale, filter, pointerEvents } = useCrossfade(presence, covered, blurMax, reducedMotion);

  const isLast = index === ACT_COUNT - 1;

  // Progress across the pinned stretch of this act.
  const { scrollYProgress: pin } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  // Frame scrubbing must stop where the exit crossfade begins, otherwise the
  // sequence would still be turning while the act dissolves. The exit window
  // is the final viewport of the pin, hence 1/(length-1) of the pin range.
  // `length` must exceed 2 for this to leave any scrub budget at all; the
  // clamp keeps a malformed value from inverting the range.
  const exitStart = isLast ? 1 : Math.max(0.05, 1 - 1 / Math.max(1.05, length - 1));
  const scrub = useTransform(pin, [0, exitStart], [0, 1], { clamp: true });

  // A sticky panel slides up into view before it pins, which would read as a
  // slide rather than a crossfade. Cancelling that travel with a transform
  // holds the panel still while it fades in. At entry = 1 the offset is zero
  // and native sticky takes over seamlessly. The panel is exactly one viewport
  // tall, so a percentage of its own height is the same distance as 100dvh —
  // and percentages are unambiguous to the transform parser.
  const lift = useTransform(entry, (v) => (index === 0 ? "0%" : `${-(1 - v) * 100}%`));

  // Freezing the sequence is a motion-preference decision, not a screen-size
  // one. `reduceEffects` is also true on any narrow or touch viewport — using
  // it here would silently disable scrubbing on every phone.
  const actMotion = useMemo<ActMotion>(
    () => ({ scrub, frozen: reducedMotion }),
    [scrub, reducedMotion],
  );

  return (
    <section
      ref={wrapperRef}
      id={id}
      style={{
        height: `${length * 100}dvh`,
        // Every act after the first overlaps its predecessor by one viewport.
        marginTop: index === 0 ? 0 : "-100dvh",
        zIndex: index * 10,
      }}
      className="relative"
    >
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        <motion.div
          data-act-panel={index}
          style={{ opacity, scale, filter, pointerEvents, y: lift, willChange: "transform, opacity" }}
          className="h-full w-full"
        >
          <ActMotionContext.Provider value={actMotion}>{children}</ActMotionContext.Provider>
        </motion.div>
      </div>
    </section>
  );
}

export interface FlowActProps {
  index: number;
  id: string;
  children: ReactNode;
}

/**
 * An act that scrolls naturally once it has fully arrived — the product grid.
 * It still crossfades at both boundaries, but between them the page behaves
 * like an ordinary document, which is what a long catalogue needs.
 */
export function FlowAct({ index, id, children }: FlowActProps) {
  const ref = useRef<HTMLElement>(null);
  const { presence, covered } = useActWiring(index, ref);
  const reduceEffects = useReducedEffects();
  const reducedMotion = usePrefersReducedMotion();
  // A full-width grid is a large surface; blur across it costs far more than
  // over a single hero panel, so it is capped well below the hero's 8px.
  const blurMax = reduceEffects ? 0 : 4;
  const { opacity, scale, filter, pointerEvents } = useCrossfade(presence, covered, blurMax, reducedMotion);

  return (
    <section
      ref={ref}
      id={id}
      style={{ marginTop: index === 0 ? 0 : "-100dvh", zIndex: index * 10 }}
      // The exit crossfade scales this section past 100% width. `clip` rather
      // than `hidden`: `hidden` would turn an ancestor into a scroll container
      // and break the sticky acts around it.
      className="relative overflow-x-clip"
    >
      <motion.div
        data-act-panel={index}
        style={{ opacity, scale, filter, pointerEvents, willChange: "transform, opacity" }}
        className="bg-bg"
      >
        {children}
      </motion.div>
    </section>
  );
}
