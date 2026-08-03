import Link from "next/link";
import type { ReactNode } from "react";

/*
 * The CTA from the reference: a circular button carrying a diagonal arrow,
 * with the label set beside it. On hover the arrow rotates a few degrees —
 * the whole micro-interaction budget for this element, deliberately.
 *
 * The arrow is mirrored under RTL via `.rtl-mirror`; a diagonal arrow that
 * still points "forward" in a right-to-left layout has to flip.
 */

interface BaseProps {
  children: ReactNode;
  className?: string;
  tone?: "accent" | "outline";
}

function Inner({ children, tone = "accent" }: { children: ReactNode; tone: "accent" | "outline" }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
          tone === "accent"
            ? "border-accent bg-accent text-[#41525f] group-hover:bg-transparent group-hover:text-accent"
            : "border-line text-ink group-hover:border-accent group-hover:text-accent",
        ].join(" ")}
      >
        <svg
          viewBox="0 0 24 24"
          className="rtl-mirror h-4 w-4 transition-transform duration-300 group-hover:rotate-45"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </svg>
      </span>
      <span className="type-utility !text-ink transition-colors duration-300 group-hover:!text-accent">
        {children}
      </span>
    </>
  );
}

export function ButtonLink({ href, children, className = "", tone = "accent" }: BaseProps & { href: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-3 ${className}`}>
      <Inner tone={tone}>{children}</Inner>
    </Link>
  );
}

export function Button({
  children,
  className = "",
  tone = "accent",
  onClick,
  disabled,
  type = "button",
}: BaseProps & {
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex items-center gap-3 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      <Inner tone={tone}>{children}</Inner>
    </button>
  );
}
