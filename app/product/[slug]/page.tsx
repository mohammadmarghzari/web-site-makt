import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogueProducts, sampleProducts, sampleSettings } from "@/lib/data/sample";
import { discountPercent, formatToman, toFa } from "@/lib/format";
import { FigurePlaceholder } from "@/components/product/FigurePlaceholder";
import { ColorSwatchRow } from "@/components/product/ColorSwatch";
import { Bracket } from "@/components/ui/Bracket";
import { ButtonLink } from "@/components/ui/Button";
import { Footer } from "@/components/ui/Footer";
import { FrameOverlay } from "@/components/ui/FrameOverlay";

/*
 * Product detail.
 *
 * Minimal on purpose: this is a phase-3 surface, brought forward only because
 * the Act 1 buy CTA and every catalogue card point here, and shipping the
 * homepage with links to a 404 would be worse than a plain page. It reads the
 * same sample data as the homepage, so phase 3 swaps its source alongside
 * everything else. Add-to-cart lands in phase 5.
 */

export function generateStaticParams() {
  return catalogueProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = sampleProducts.find((p) => p.slug === slug);
  if (!product) return { title: "محصول یافت نشد" };
  return {
    title: product.name_fa,
    description: product.description_fa,
    openGraph: { title: `${product.name_fa} | MAKT`, description: product.tagline_fa },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = sampleProducts.find((p) => p.slug === slug);
  if (!product || product.status === "draft") notFound();

  const soldOut = product.status === "sold_out" || product.stock === 0;
  const discount = discountPercent(product.price, product.compare_price);

  const specs: { label: string; value: string; ltr?: boolean }[] = [
    { label: "مقیاس", value: product.scale, ltr: true },
    { label: "قد", value: `${toFa(product.height_cm)} سانتی‌متر` },
    { label: "جنس", value: product.material },
    ...(product.articulation !== null
      ? [{ label: "نقاط مفصل", value: `${toFa(product.articulation)} نقطه` }]
      : []),
  ];

  return (
    <>
      <FrameOverlay />

      <main className="relative z-10 min-h-[100dvh] px-4 py-10 sm:px-8">
        <nav className="mb-8">
          <Link href="/" className="type-utility transition-colors hover:!text-accent">
            ← بازگشت به خانه
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div
            className="relative flex aspect-[4/5] items-center justify-center bg-panel p-10"
            style={{ borderRadius: "var(--radius)" }}
          >
            <FigurePlaceholder seed={product.slug} className="h-full w-auto" />
            {soldOut && (
              <span className="type-utility absolute top-3 bg-bg-deep/80 px-2 py-1 !text-ink" style={{ insetInlineStart: "0.75rem" }}>
                ناموجود
              </span>
            )}
          </div>

          <div>
            <Bracket>فیگور</Bracket>
            <h1 className="type-display mt-4 text-5xl sm:text-6xl">{product.name_fa}</h1>
            <p className="type-utility mt-2" dir="ltr">
              {product.name_en}
            </p>

            <p className="mt-6 max-w-prose text-sm leading-loose text-ink-muted">
              {product.description_fa}
            </p>

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

            {product.colors.length > 0 && (
              <div className="mt-6 border-t border-line pt-6">
                <Bracket className="mb-3 block">رنگ‌ها</Bracket>
                <ColorSwatchRow colors={product.colors} />
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <div>
                {discount !== null && product.compare_price && (
                  <div className="type-utility line-through opacity-60">
                    {toFa(product.compare_price)}
                  </div>
                )}
                <div className={`text-lg ${soldOut ? "text-ink-muted line-through" : "text-ink"}`}>
                  {formatToman(product.price)}
                </div>
              </div>

              {/* Cart arrives in phase 5; until then this is an enquiry route
                  rather than a dead button. */}
              {soldOut ? (
                <span className="type-utility">فعلاً موجود نیست</span>
              ) : (
                <ButtonLink href={sampleSettings.socials[0]?.href ?? "/"}>سفارش</ButtonLink>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="relative z-10 px-4 sm:px-8">
        <Footer settings={sampleSettings} />
      </div>
    </>
  );
}
