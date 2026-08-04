import type { Metadata } from "next";
import { getSettings } from "@/lib/repo/settings";
import { CartView } from "@/components/cart/CartView";
import { Footer } from "@/components/ui/Footer";
import { FrameOverlay } from "@/components/ui/FrameOverlay";

export const metadata: Metadata = {
  title: "سبد خرید",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const settings = await getSettings();

  return (
    <>
      <FrameOverlay />
      <main className="relative z-10 min-h-[100dvh] px-4 py-10 sm:px-8">
        <CartView shippingFlatPrice={settings.shipping_flat_price} />
      </main>
      <div className="relative z-10 px-4 sm:px-8">
        <Footer settings={settings} />
      </div>
    </>
  );
}
