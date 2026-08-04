"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/types";
import { fetchProductById } from "@/lib/repo/client";
import { ProductForm } from "./ProductForm";
import { Bracket } from "@/components/ui/Bracket";

function EditInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    void fetchProductById(id).then((data) => {
      if (!cancelled) setProduct(data);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (product === undefined) return <p className="type-utility py-10">در حال بارگذاری…</p>;

  if (product === null) {
    return (
      <div className="py-10">
        <h1 className="type-display text-3xl">محصول پیدا نشد</h1>
        <p className="mt-4 text-[13px] text-ink-muted">
          شاید حذف شده باشد یا نشانی درست نباشد.
        </p>
        <Link href="/admin/products" className="type-utility mt-6 inline-block hover:!text-accent">
          ← بازگشت به فهرست
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/products" className="type-utility transition-colors hover:!text-accent">
        ← بازگشت به فهرست
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Bracket>ویرایش</Bracket>
          <h1 className="type-display mt-2 text-3xl">{product.name_fa}</h1>
        </div>
        <Link
          href={`/product/${product.slug}`}
          target="_blank"
          className="type-utility transition-colors hover:!text-accent"
        >
          دیدن در سایت ↗
        </Link>
      </div>
      <div className="mt-8">
        <ProductForm product={product} />
      </div>
    </div>
  );
}

export function ProductEditView() {
  // useSearchParams needs a Suspense boundary; without one the whole route is
  // forced out of static generation.
  return (
    <Suspense fallback={<p className="type-utility py-10">در حال بارگذاری…</p>}>
      <EditInner />
    </Suspense>
  );
}
