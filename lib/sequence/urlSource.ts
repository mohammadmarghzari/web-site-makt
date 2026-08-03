import type { FrameSource } from "./types";

/*
 * Frame source backed by real image URLs (Supabase Storage, phase 3).
 *
 * Two properties matter more than raw speed:
 *
 *  1. Scrubbing must feel responsive before the whole sequence has arrived.
 *     A coarse pass loads every Nth frame first, so the playhead always has
 *     *something* to draw; the gaps fill in afterwards.
 *
 *  2. The first draw must not stutter. `img.decode()` is awaited before a
 *     frame is published, moving decode cost off the paint that follows.
 */

const COARSE_STRIDE = 8;

export interface UrlSourceOptions {
  /** Ordered frame URLs. Index 0 doubles as the poster. */
  frames: string[];
  /** Passed through to the <img> crossOrigin attribute for CDN-hosted frames. */
  crossOrigin?: "anonymous" | "use-credentials";
}

export function createUrlSource({ frames, crossOrigin }: UrlSourceOptions): FrameSource {
  const count = frames.length;
  const decoded: (HTMLImageElement | null)[] = new Array(count).fill(null);
  const pending = new Set<number>();
  let disposed = false;

  const load = (index: number) => {
    if (disposed || index < 0 || index >= count) return;
    if (decoded[index] || pending.has(index)) return;
    pending.add(index);

    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.decoding = "async";
    img.src = frames[index];

    const publish = () => {
      pending.delete(index);
      if (!disposed) decoded[index] = img;
    };

    // decode() rejects on some browsers for cached images; onload is the
    // fallback so a rejection never strands the frame permanently.
    img
      .decode()
      .then(publish)
      .catch(() => {
        if (img.complete && img.naturalWidth > 0) publish();
        else {
          img.onload = publish;
          img.onerror = () => pending.delete(index);
        }
      });
  };

  const ready = new Promise<void>((resolve) => {
    if (count === 0) {
      resolve();
      return;
    }
    const coarse: number[] = [];
    for (let i = 0; i < count; i += COARSE_STRIDE) coarse.push(i);
    if (!coarse.includes(count - 1)) coarse.push(count - 1);

    let settled = 0;
    const tick = () => {
      settled += 1;
      if (settled < coarse.length) return;
      resolve();
      // Coarse pass done: queue the remaining frames at low priority. Browsers
      // cap concurrent connections, so request ordering acts as the hint.
      for (let i = 0; i < count; i++) if (i % COARSE_STRIDE !== 0) load(i);
    };

    coarse.forEach((i) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.decoding = "async";
      img.src = frames[i];
      const publish = () => {
        if (!disposed) decoded[i] = img;
        tick();
      };
      img
        .decode()
        .then(publish)
        .catch(() => {
          if (img.complete && img.naturalWidth > 0) publish();
          else {
            img.onload = publish;
            img.onerror = tick;
          }
        });
    });
  });

  return {
    count,
    ensure(from, to) {
      for (let i = Math.max(0, from); i <= Math.min(count - 1, to); i++) load(i);
    },
    get(index) {
      const clamped = Math.max(0, Math.min(count - 1, index));
      if (decoded[clamped]) return decoded[clamped];
      for (let d = 1; d < count; d++) {
        if (decoded[clamped - d]) return decoded[clamped - d];
        if (decoded[clamped + d]) return decoded[clamped + d];
      }
      return null;
    },
    ready,
    dispose() {
      disposed = true;
      decoded.fill(null);
      pending.clear();
    },
  };
}
