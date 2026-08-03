/**
 * Decorative barcode strip for the footer — a nod to the reference design's
 * product-packaging language.
 *
 * The bar widths come from a small deterministic hash of the `seed` rather
 * than Math.random, because a server-rendered random pattern would differ from
 * the client's and trip a hydration mismatch.
 */
export function Barcode({ seed = "MAKT", bars = 44 }: { seed?: string; bars?: number }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;

  const widths: number[] = [];
  for (let i = 0; i < bars; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    widths.push(1 + (hash % 3));
  }

  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden="true">
      {widths.map((w, i) => (
        <span
          key={i}
          className="block bg-ink-muted"
          style={{ width: `${w}px`, height: `${60 + ((w * 13 + i * 7) % 40)}%`, opacity: 0.5 }}
        />
      ))}
    </div>
  );
}
