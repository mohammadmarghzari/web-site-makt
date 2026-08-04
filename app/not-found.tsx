import { Bracket } from "@/components/ui/Bracket";
import { ButtonLink } from "@/components/ui/Button";
import { FrameOverlay } from "@/components/ui/FrameOverlay";

/** Designed 404 — the brief is explicit that no state may be a blank page. */
export default function NotFound() {
  return (
    <>
      <FrameOverlay />
      <main className="relative z-10 flex min-h-[100dvh] items-center px-4 sm:px-8">
        <div className="mx-auto w-full max-w-lg">
          <Bracket>خطای ۴۰۴</Bracket>
          <h1 className="type-display mt-4 text-5xl sm:text-6xl">
            این صفحه
            <br />
            پیدا نشد
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-muted">
            شاید نشانی را اشتباه وارد کرده‌اید، یا این فیگور دیگر در کاتالوگ نیست.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <ButtonLink href="/">بازگشت به خانه</ButtonLink>
            <a href="/#act-2" className="type-utility transition-colors hover:!text-accent">
              دیدن کاتالوگ
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
