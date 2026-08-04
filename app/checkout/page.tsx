import type { Metadata } from "next";
import { getSettings } from "@/lib/repo/settings";
import { isMockPayment } from "@/lib/payment";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { Footer } from "@/components/ui/Footer";
import { FrameOverlay } from "@/components/ui/FrameOverlay";

export const metadata: Metadata = {
  title: "تکمیل سفارش",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const settings = await getSettings();

  return (
    <>
      <FrameOverlay />
      <main className="relative z-10 min-h-[100dvh] px-4 py-10 sm:px-8">
        <CheckoutForm
          shippingFlatPrice={settings.shipping_flat_price}
          mockPayment={isMockPayment()}
        />
      </main>
      <div className="relative z-10 px-4 sm:px-8">
        <Footer settings={settings} />
      </div>
    </>
  );
}
