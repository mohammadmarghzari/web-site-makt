import type { ReactNode } from "react";

/**
 * The bracketed micro-label — `[ کاتالوگ ]` — that is this design's visual
 * signature. Used generously but never decoratively: each one names the thing
 * it sits above.
 */
export function Bracket({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`type-utility inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden="true">[</span>
      {children}
      <span aria-hidden="true">]</span>
    </span>
  );
}
