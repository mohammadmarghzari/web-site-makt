import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getPublishedProducts } from "@/lib/repo/products";
import { getSettings } from "@/lib/repo/settings";
import { discountPercent, formatToman, toFa } from "@/lib/format";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductBuyPanel } from "@/components/product/ProductBuyPanel";
import { ProductCard } from "@/components/product/ProductCard";
import { Bracket } from "@/components/ui/Bracket";
import { Footer } from "@/components/ui/Footer";
import { FrameOverlay } from "@/components/ui/FrameOverlay";
import { CartButton } from "@/components/cart/CartButton";

export const revalidate = 60;

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "محصول یافت نشد" };

  return {
    title: product.name_fa,
    description: product.description_fa || product.tagline_fa,
    openGraph: {
      title: `${product.name_fa} | MAKT`,
      description: product.tagline_fa,
      type: "website",
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings, all] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
    getPublishedProducts(),
  ]);
  if (!product) notFound();

  const discount = discountPercent(product.price, product.compare_price);
  const related = all.filter((p) => p.id !== product.id).slice(0, 4);

  const specs: { label: string; value: string; ltr?: boolean }[] = [
    { label: "مقیاس", value: product.scale, ltr: true },
    { label: "قد", value: `${toFa(product.height_cm)} سانتی‌متر` },
    { label: "جنس", value: product.material },
    ...(product.articulation !== null
      ? [{ label: "نقاط مفصل", value: `${toFa(product.articulation)} نقطه` }]
      : []),
  ];

  /*
   * Product structured data. Emitted server-side so crawlers see it in the
   * initial HTML. Availability and price must mirror what the page shows —
   * a mismatch is worse than omitting the markup entirely.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_fa,
    alternateName: product.name_en || undefined,
    description: product.description_fa || product.tagline_fa,
    sku: product.slug,
    image: product.images.length > 0 ? product.images : undefined,
    brand: { "@type": "Brand", name: settings.brand_name },
    offers: {
      "@type": "Offer",
      // Prices are stored and displayed in Toman, but Toman has no ISO 4217
      // code — only Rial (IRR) does. Publishing the Toman figure under IRR
      // would understate every price tenfold to any consumer of this markup,
      // so it is converted here.
      price: product.price * 10,
      priceCurrency: "IRR",
      availability:
        product.status === "sold_out" || product.stock === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <FrameOverlay />
      <CartButton />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="relative z-10 min-h-[100dvh] px-4 py-10 sm:px-8">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="type-utility transition-colors hover:!text-accent">
            ← بازگشت به خانه
          </Link>
          <Bracket>فیگور</Bracket>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery product={product} discount={discount} />

          <div>
            <h1 className="type-display text-5xl sm:text-6xl">{product.name_fa}</h1>
            {product.name_en && (
              <p className="type-utility mt-2" dir="ltr">
                {product.name_en}
              </p>
            )}
            {product.tagline_fa && (
              <p className="mt-4 text-sm text-ink-muted">{product.tagline_fa}</p>
            )}

            {product.description_fa && (
              <p className="mt-6 max-w-prose text-sm leading-loose text-ink-muted">
                {product.description_fa}
              </p>
            )}

            <dl className="mt-8 grid grid-cols-2 gap-y-3 border-t border-line pt-6">
              {specs.map((spec) => (
                <div key={spec.label} className="contents">
                  <dt className="type-utility">{spec.label}</dt>
                  <dd
                    className="type-utility !text-ink text-end"
                    dir={spec.ltr ? "ltr" : undefined}
                  >
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>

            {product.accessories.length > 0 && (
              <div className="mt-6 border-t border-line pt-6">
                <Bracket>همراه جعبه</Bracket>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {product.accessories.map((item) => (
                    <li key={item} className="type-utility border border-line px-2.5 py-1">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ProductBuyPanel product={product} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 border-t border-line pt-10">
            <Bracket>فیگورهای دیگر</Bracket>
            <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <div className="relative z-10 px-4 sm:px-8">
        <Footer settings={settings} />
      </div>
    </>
  );
}
