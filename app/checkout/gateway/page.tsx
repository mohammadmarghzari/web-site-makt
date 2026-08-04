import type { Metadata } from "next";
import { Bracket } from "@/components/ui/Bracket";
import { FrameOverlay } from "@/components/ui/FrameOverlay";

export const metadata: Metadata = {
  title: "پرداخت آزمایشی",
  robots: { index: false, follow: false },
};

/*
 * Stand-in for the bank's payment page, used when no merchant ID is set.
 *
 * Deliberately looks nothing like a real gateway: it says plainly that no
 * money moves. The two buttons hit the same callback URL the real gateway
 * would, with the same query parameters, so the code path being exercised is
 * the production one.
 */
export default async function MockGatewayPage({
  searchParams,
}: {
  searchParams: Promise<{ authority?: string; callback?: string }>;
}) {
  const { authority = "", callback = "" } = await searchParams;

  // Only ever return to our own callback route — a forged `callback` must not
  // turn this page into an open redirect.
  let successUrl = "#";
  let cancelUrl = "#";
  let valid = false;
  try {
    const target = new URL(callback);
    if (target.pathname === "/api/payment/verify") {
      target.searchParams.set("Authority", authority);
      target.searchParams.set("Status", "OK");
      successUrl = target.toString();

      const cancel = new URL(target.toString());
      cancel.searchParams.set("Status", "NOK");
      cancelUrl = cancel.toString();
      valid = true;
    }
  } catch {
    valid = false;
  }

  return (
    <>
      <FrameOverlay />
      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4">
        <div
          className="w-full max-w-md border border-line bg-bg-deep/30 p-6"
          style={{ borderRadius: "var(--radius)" }}
        >
          <Bracket>درگاه آزمایشی</Bracket>
          <h1 className="type-display mt-4 text-3xl">پرداخت شبیه‌سازی‌شده</h1>
          <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
            این صفحه جای درگاه بانک را گرفته چون هنوز کد پذیرندهٔ زرین‌پال تنظیم نشده
            است. هیچ مبلغی جابه‌جا نمی‌شود.
          </p>
          <p className="type-utility mt-4" dir="ltr">
            {authority || "—"}
          </p>

          {valid ? (
            <div className="mt-8 flex flex-col gap-3">
              <a
                href={successUrl}
                className="border border-accent bg-accent px-4 py-2.5 text-center text-[13px] text-[#41525f] transition-colors hover:bg-transparent hover:text-accent"
                style={{ borderRadius: "var(--radius)" }}
              >
                پرداخت موفق
              </a>
              <a
                href={cancelUrl}
                className="border border-line px-4 py-2.5 text-center text-[13px] text-ink transition-colors hover:border-accent hover:text-accent"
                style={{ borderRadius: "var(--radius)" }}
              >
                انصراف از پرداخت
              </a>
            </div>
          ) : (
            <p className="type-utility mt-8 !text-accent" role="alert">
              آدرس بازگشت نامعتبر است.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
