import type { Metadata } from "next";
import { getSettings } from "@/lib/repo/settings";
import { OrderReceipt } from "@/components/cart/OrderReceipt";
import { Footer } from "@/components/ui/Footer";
import { FrameOverlay } from "@/components/ui/FrameOverlay";

export const metadata: Metadata = {
  title: "سفارش ثبت شد",
  robots: { index: false, follow: false },
};

export default async function CheckoutResultPage() {
  const settings = await getSettings();

  return (
    <>
      <FrameOverlay />
      <main className="relative z-10 flex min-h-[80dvh] items-center px-4 py-16 sm:px-8">
        <OrderReceipt />
      </main>
      <div className="relative z-10 px-4 sm:px-8">
        <Footer settings={settings} />
      </div>
    </>
  );
}
