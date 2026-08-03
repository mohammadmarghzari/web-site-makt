import { Barcode } from "./Barcode";
import { Bracket } from "./Bracket";
import type { SiteSettings } from "@/lib/types";

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = "۱۴۰۵";

  return (
    <footer className="border-t border-line px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-display text-3xl" dir="ltr">
            {settings.brand_name}
          </p>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-ink-muted">
            {settings.footer_note}
          </p>
        </div>

        <nav aria-label="شبکه‌های اجتماعی">
          <Bracket>ارتباط</Bracket>
          <ul className="mt-3 flex flex-col gap-1.5">
            {settings.socials.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[13px] text-ink-muted transition-colors duration-300 hover:text-accent"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Barcode seed={settings.brand_name} />
          <span className="type-utility" dir="ltr">
            MAKT — 1/12 SCALE
          </span>
        </div>
      </div>

      <p className="type-utility mt-8 border-t border-line pt-5">
        © {year} {settings.brand_name} — همهٔ حقوق محفوظ است
      </p>
    </footer>
  );
}
