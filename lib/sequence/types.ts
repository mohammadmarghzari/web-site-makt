/*
 * Frame source contract for the scroll-driven image sequence.
 *
 * The renderer (`components/hero/SequenceCanvas.tsx`) knows nothing about
 * where frames come from. Today that is a procedurally drawn placeholder;
 * in phase 3 it becomes a list of Supabase Storage URLs. Swapping one for the
 * other touches a single line in the hero component.
 */
export interface FrameSource {
  /** Total number of frames in the sequence. */
  readonly count: number;

  /**
   * Hint that frames in `[from, to]` are about to be needed, so the source can
   * prioritise them. Called on every scrub with a window ahead of the
   * playhead. Must be cheap and idempotent — it is invoked at frame rate.
   */
  ensure(from: number, to: number): void;

  /**
   * The frame at `index` if it is decoded and ready, otherwise the nearest
   * ready frame, otherwise null. Never blocks and never triggers a load —
   * returning a slightly stale frame is always better than dropping one.
   */
  get(index: number): CanvasImageSource | null;

  /** Resolves once enough frames exist that scrubbing looks continuous. */
  readonly ready: Promise<void>;

  /** Release decoded bitmaps. Called when the hero unmounts. */
  dispose(): void;
}
