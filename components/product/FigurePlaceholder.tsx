/*
 * Vector stand-in shown wherever a product has no photography yet.
 *
 * This exists so phase 1 has no binary assets at all: nothing to commit, and
 * nothing to delete later. It renders an abstract articulated figure whose
 * proportions and pose vary deterministically with the product slug, so the
 * grid reads as six distinct items rather than one repeated tile.
 *
 * Deterministic, not random — the same markup must come out of the server and
 * the client or hydration will complain.
 */
export function FigurePlaceholder({ seed, className = "" }: { seed: string; className?: string }) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const pick = (min: number, max: number, salt: number) => {
    const v = ((h >>> (salt % 24)) ^ Math.imul(h, salt + 1)) >>> 0;
    return min + (v % 1000) / 1000 * (max - min);
  };

  const armSwing = pick(-22, 22, 3);
  const legSpread = pick(6, 18, 7);
  const headTilt = pick(-8, 8, 11);
  const shoulder = pick(16, 21, 13);
  const stroke = "rgba(242,245,247,0.55)";
  const fill = "rgba(242,245,247,0.10)";

  return (
    <svg
      viewBox="0 0 120 160"
      className={className}
      role="img"
      aria-label="تصویر محصول هنوز بارگذاری نشده است"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Ground ellipse — grounds the figure so it does not read as floating. */}
      <ellipse cx="60" cy="146" rx="26" ry="4.5" fill="rgba(0,0,0,0.16)" />

      <g stroke={stroke} strokeWidth="1.6" strokeLinecap="round" fill={fill}>
        {/* Head */}
        <g transform={`rotate(${headTilt} 60 26)`}>
          <ellipse cx="60" cy="26" rx="10" ry="11.5" />
          <path d="M53 24h14" strokeWidth="1.2" opacity="0.7" />
        </g>

        {/* Neck and torso */}
        <path d="M60 37v6" />
        <path
          d={`M${60 - shoulder} 44h${shoulder * 2}l-3 34h-${shoulder * 2 - 6}z`}
          strokeLinejoin="round"
        />
        {/* Panel seam — the moulding line collectors look for */}
        <path d="M60 46v30" strokeWidth="1" opacity="0.55" />

        {/* Arms, swung by the seed */}
        <g transform={`rotate(${armSwing} ${60 - shoulder} 46)`}>
          <path d={`M${60 - shoulder} 46l-8 22`} />
          <circle cx={60 - shoulder - 8} cy="68" r="2.4" fill="rgba(242,245,247,0.3)" />
          <path d={`M${60 - shoulder - 8} 68l-2 20`} />
        </g>
        <g transform={`rotate(${-armSwing} ${60 + shoulder} 46)`}>
          <path d={`M${60 + shoulder} 46l8 22`} />
          <circle cx={60 + shoulder + 8} cy="68" r="2.4" fill="rgba(242,245,247,0.3)" />
          <path d={`M${60 + shoulder + 8} 68l2 20`} />
        </g>

        {/* Hips and legs */}
        <path d="M50 78h20" />
        <path d={`M55 78l-${legSpread * 0.4} 28`} />
        <circle cx={55 - legSpread * 0.4} cy="106" r="2.6" fill="rgba(242,245,247,0.3)" />
        <path d={`M${55 - legSpread * 0.4} 106l-${legSpread * 0.3} 32`} />

        <path d={`M65 78l${legSpread * 0.4} 28`} />
        <circle cx={65 + legSpread * 0.4} cy="106" r="2.6" fill="rgba(242,245,247,0.3)" />
        <path d={`M${65 + legSpread * 0.4} 106l${legSpread * 0.3} 32`} />
      </g>

      {/* Scale reference tick, echoing the packaging language */}
      <g stroke="rgba(242,245,247,0.28)" strokeWidth="1">
        <path d="M14 20v120" />
        <path d="M11 20h6M11 140h6M11 80h4" />
      </g>
    </svg>
  );
}
