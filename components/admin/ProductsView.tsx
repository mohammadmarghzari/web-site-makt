"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { listAllProducts } from "@/lib/repo/client";
import { ProductAdminList } from "./ProductAdminList";
import { Bracket } from "@/components/ui/Bracket";

export function ProductsView() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listAllProducts().then((data) => {
      if (!cancelled) setProducts(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Bracket>محصولات</Bracket>
          <h1 className="type-display mt-2 text-3xl">کاتالوگ</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="border border-accent bg-accent px-4 py-2 text-[13px] text-[#41525f] transition-colors hover:bg-transparent hover:text-accent"
          style={{ borderRadius: "var(--radius)" }}
        >
          افزودن محصول
        </Link>
      </div>

      {products === null ? (
        <p className="type-utility mt-8">در حال بارگذاری…</p>
      ) : (
        <ProductAdminList products={products} />
      )}
    </div>
  );
}
