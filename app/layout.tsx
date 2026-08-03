import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/*
 * Fonts are self-hosted rather than pulled from a CDN: an Iranian visitor on a
 * flaky connection should never have the headline face blocked by a third
 * party. Both files are the Arabic subset, which is what Persian needs.
 *
 * Estedad stands in for Morabba Black — Morabba is not distributed anywhere
 * reachable. Swapping it back is this file plus one asset.
 */
const estedad = localFont({
  src: [{ path: "./fonts/Estedad-Black.woff2", weight: "900", style: "normal" }],
  variable: "--font-estedad",
  display: "swap",
  // Persian text must never fall back to a Latin face mid-headline.
  fallback: ["system-ui", "sans-serif"],
});

const vazirmatn = localFont({
  src: [
    { path: "./fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MAKT — اکشن‌فیگورهای مقیاس ۱/۱۲",
    template: "%s | MAKT",
  },
  description:
    "فروشگاه اکشن‌فیگورهای کلکسیونی MAKT — پیکره‌های مفصل‌دار مقیاس ۱/۱۲ با جزئیات دستی‌بازبینی‌شده و ارسال به سراسر ایران.",
  keywords: ["اکشن فیگور", "فیگور کلکسیونی", "مقیاس ۱/۱۲", "MAKT", "فیگور مفصل‌دار"],
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "MAKT",
    title: "MAKT — اکشن‌فیگورهای مقیاس ۱/۱۲",
    description:
      "پیکره‌های مفصل‌دار مقیاس ۱/۱۲ با جزئیات دستی‌بازبینی‌شده. ساخت ایران.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#4E5F6E",
  width: "device-width",
  initialScale: 1,
  // The layout is a fixed inset frame; letting it zoom is fine and is an
  // accessibility requirement, so maximumScale is deliberately not pinned.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${estedad.variable} ${vazirmatn.variable}`}>
      <body className="antialiased">
        {/* Keyboard users must be able to reach the catalogue without tabbing
            through the whole hero. */}
        <a
          href="#act-2"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-3 focus:bg-accent focus:px-4 focus:py-2 focus:text-[13px] focus:text-[#41525f]"
        >
          پرش به کاتالوگ محصولات
        </a>
        {children}
      </body>
    </html>
  );
}
