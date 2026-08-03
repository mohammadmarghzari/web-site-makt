import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { Bracket } from "@/components/ui/Bracket";
import { ButtonLink } from "@/components/ui/Button";
import { toFaPadded } from "@/lib/format";

/*
 * Act 2 — the catalogue.
 *
 * The empty state is a designed state, not a blank page: phase 4 will let the
 * admin add the first product, and this is what they will see until they do.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 border border-line px-6 py-16 text-center">
        <Bracket>کاتالوگ خالی</Bracket>
        <p className="type-display max-w-md text-2xl">هنوز محصولی ثبت نشده</p>
        <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">
          اولین فیگور را از پنل مدیریت اضافه کنید تا همین‌جا نمایش داده شود.
        </p>
        <ButtonLink href="/admin/products" tone="outline">
          افزودن محصول
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <Bracket>کاتالوگ</Bracket>
          <h2 className="type-display mt-3 text-4xl sm:text-5xl lg:text-6xl">
            همهٔ
            <br />
            فیگورها
          </h2>
        </div>
        <p className="type-utility">
          {toFaPadded(products.length)} محصول — مقیاس ۱/۱۲
        </p>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </>
  );
}
