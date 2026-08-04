"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Admin section navigation.
 *
 * Scrolls horizontally rather than wrapping or collapsing into a menu: the
 * whole panel is used from a phone, and a one-tap row beats a hamburger for
 * five destinations.
 */
const LINKS = [
  { href: "/admin", label: "خلاصه", exact: true },
  { href: "/admin/products", label: "محصولات" },
  { href: "/admin/scenes", label: "پرده‌ها" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/settings", label: "تنظیمات" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="بخش‌های پنل" className="border-b border-line">
      <ul className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "block px-3 py-2 text-[13px] transition-colors",
                  active ? "bg-panel text-ink" : "text-ink-muted hover:text-ink",
                ].join(" ")}
                style={{ borderRadius: "var(--radius)" }}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
