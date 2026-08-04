"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { toFa } from "@/lib/format";

/**
 * Floating cart affordance.
 *
 * Positioned exactly like ProgressRail — `fixed` at the top of the stacking
 * order — so it never becomes an ancestor of the sticky hero panels and
 * cannot disturb the scroll engine.
 *
 * Hidden entirely while the cart is empty: there is nothing to go to, and the
 * homepage's first impression should not carry commerce chrome.
 */
export function CartButton() {
  const { count, hydrated } = useCart();
  if (!hydrated || count === 0) return null;

  return (
    <Link
      href="/cart"
      className="fixed top-0 z-50 m-3 flex items-center gap-2 border border-line bg-bg-deep/85 px-3 py-2 backdrop-blur-sm transition-colors hover:border-accent sm:m-6"
      style={{ insetInlineEnd: "var(--frame-inset)", borderRadius: "var(--radius)" }}
      aria-label={`سبد خرید، ${toFa(count)} قلم`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 5h2l1.6 9.2a2 2 0 0 0 2 1.8h6.9a2 2 0 0 0 2-1.6L20 8H6.5" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="17" cy="20" r="1" />
      </svg>
      <span className="type-utility !text-ink">{toFa(count)}</span>
    </Link>
  );
}
