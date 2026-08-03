import type { FrameSource } from "./types";

/*
 * Placeholder frame source for phases 1–2.
 *
 * No product photography exists yet, and frame assets must never live in the
 * repository. This draws the sequence itself: an abstract articulated figure
 * rotating on a turntable.
 *
 * Frames are rendered *on demand* into a small ring of reusable canvases, not
 * pre-rendered and kept. That is not a micro-optimisation — a 96-frame
 * sequence cached at 1280×800 would hold roughly 390 MB of canvas backing
 * store and wedge the tab. Redrawing a few dozen vector paths per scrub is far
 * cheaper than storing the result, and unlike a network-backed source there is
 * no latency to hide, so caching buys nothing beyond avoiding a repeat draw of
 * the frame the playhead is sitting on.
 */

/** Canvases held at once. Enough to absorb small back-and-forth scrubbing. */
const CACHE_SIZE = 10;

const PALETTE = {
  bgTop: "#5c7182",
  bgBottom: "#41525f",
  body: "#8da1b0",
  bodyDark: "#63798a",
  edge: "#e4edf2",
  accent: "#c9d3da",
};

/** Rotation is driven by frame index; one full turn across the sequence. */
function drawFigure(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const angle = t * Math.PI * 2;
  const cx = w / 2;
  const cy = h / 2;
  const unit = Math.min(w, h) / 100;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, PALETTE.bgTop);
  bg.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);

  // Ground shadow, drifting slightly with the rotation.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#2f3d48";
  ctx.beginPath();
  ctx.ellipse(Math.sin(angle) * unit * 2, unit * 34, unit * 18, unit * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Perspective is faked with a horizontal squash. Enough to sell rotation
  // without the cost of a real 3D pipeline.
  const squash = Math.cos(angle);
  const depth = Math.sin(angle);

  const limb = (x: number, y: number, len: number, width: number, rot: number, shade: string) => {
    ctx.save();
    ctx.translate(x * squash, y);
    ctx.rotate(rot);
    ctx.fillStyle = shade;
    ctx.strokeStyle = PALETTE.edge;
    ctx.lineWidth = unit * 0.35;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.roundRect(-width / 2, 0, width, len, width / 2);
    ctx.fill();
    ctx.stroke();
    // Joint pin — the cue that this is an articulated figure.
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.arc(0, len * 0.52, width * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const front = depth >= 0 ? PALETTE.body : PALETTE.bodyDark;
  const back = depth >= 0 ? PALETTE.bodyDark : PALETTE.body;

  // Far limbs first, so the torso overlaps them correctly.
  limb(unit * 7, -unit * 12, unit * 20, unit * 4.5, 0.35 + depth * 0.25, back);
  limb(unit * 4, unit * 6, unit * 24, unit * 5.5, -0.12 + depth * 0.15, back);

  // Torso.
  ctx.save();
  ctx.fillStyle = front;
  ctx.strokeStyle = PALETTE.edge;
  ctx.lineWidth = unit * 0.45;
  ctx.beginPath();
  ctx.roundRect(
    -unit * 9 * Math.abs(squash) - unit * 2,
    -unit * 16,
    unit * 18 * Math.abs(squash) + unit * 4,
    unit * 24,
    unit * 3,
  );
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -unit * 14);
  ctx.lineTo(0, unit * 6);
  ctx.stroke();
  ctx.restore();

  // Head, with a visor that sweeps across as the figure turns.
  ctx.save();
  ctx.fillStyle = front;
  ctx.strokeStyle = PALETTE.edge;
  ctx.lineWidth = unit * 0.45;
  ctx.beginPath();
  ctx.ellipse(unit * 1.2 * squash, -unit * 22, unit * 5.2, unit * 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath();
  ctx.ellipse(unit * (1.2 + squash * 1.6), -unit * 22.5, unit * 2.6, unit * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Near limbs.
  limb(-unit * 7, -unit * 12, unit * 20, unit * 4.5, -0.35 - depth * 0.25, front);
  limb(-unit * 4, unit * 6, unit * 24, unit * 5.5, 0.12 - depth * 0.15, front);

  ctx.restore();

  // Turntable ring with an orbiting bead — makes the rotation legible even
  // when the silhouette is close to symmetric.
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = PALETTE.edge;
  ctx.lineWidth = unit * 0.3;
  ctx.beginPath();
  ctx.ellipse(cx, cy + unit * 34, unit * 22, unit * 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = PALETTE.edge;
  ctx.beginPath();
  ctx.arc(
    cx + Math.cos(angle) * unit * 22,
    cy + unit * 34 + Math.sin(angle) * unit * 5,
    unit * 0.9,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

export interface ProceduralSourceOptions {
  count: number;
  width: number;
  height: number;
  /** Shifts the starting rotation so Act 1 and Act 3 do not look identical. */
  phase?: number;
}

export function createProceduralSource({
  count,
  width,
  height,
  phase = 0,
}: ProceduralSourceOptions): FrameSource {
  // Insertion-ordered, so the first key is always the oldest entry.
  const cache = new Map<number, HTMLCanvasElement>();
  const spares: HTMLCanvasElement[] = [];
  let disposed = false;

  const render = (index: number): HTMLCanvasElement | null => {
    if (disposed) return null;
    const hit = cache.get(index);
    if (hit) return hit;

    // Reuse an evicted canvas rather than allocating a new backing store.
    let canvas = spares.pop();
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawFigure(ctx, width, height, (index / count + phase) % 1);

    cache.set(index, canvas);
    if (cache.size > CACHE_SIZE) {
      const oldest = cache.keys().next().value as number;
      const evicted = cache.get(oldest);
      cache.delete(oldest);
      if (evicted) spares.push(evicted);
    }
    return canvas;
  };

  // Frame 0 doubles as the poster, so it is the only one drawn up front.
  const ready = Promise.resolve().then(() => {
    render(0);
  });

  return {
    count,
    ensure(from) {
      // Drawing is synchronous and local — there is no network latency to hide,
      // so only the frame about to be shown is worth pre-rendering. Honouring
      // the full requested window would thrash the cache on every scrub.
      render(Math.max(0, Math.min(count - 1, from + 4)));
    },
    get(index) {
      return render(Math.max(0, Math.min(count - 1, index)));
    },
    ready,
    dispose() {
      disposed = true;
      cache.clear();
      spares.length = 0;
    },
  };
}
