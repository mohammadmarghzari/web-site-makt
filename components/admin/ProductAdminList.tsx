"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { reorderProducts } from "@/lib/admin/mutations";
import { FigurePlaceholder } from "@/components/product/FigurePlaceholder";
import { inputClass } from "@/components/ui/Field";
import { formatToman, toFa } from "@/lib/format";

/*
 * Product list with search, status filter and reordering.
 *
 * Rendered as cards rather than a table on purpose: the whole panel is
 * operated from a phone, and a five-column table there is unusable.
 *
 * Reordering uses explicit up/down buttons instead of drag-and-drop. Dragging
 * on a touch screen fights the page scroll, and this has to work one-handed.
 */

const STATUS_LABELS: Record<Product["status"], string> = {
  published: "منتشرشده",
  draft: "پیش‌نویس",
  sold_out: "ناموجود",
};

export function ProductAdminList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Product["status"]>("all");
  const [order, setOrder] = useState(products.map((p) => p.id));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const ordered = useMemo(
    () => order.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p)),
    [order, byId],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordered.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return (
        p.name_fa.toLowerCase().includes(q) ||
        p.name_en.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
      );
    });
  }, [ordered, query, status]);

  // Reordering is only coherent over the full, unfiltered list — moving an
  // item inside a filtered view would produce positions that surprise you the
  // moment the filter clears.
  const canReorder = query.trim() === "" && status === "all";

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [id] = next.splice(index, 1);
    next.splice(target, 0, id);
    setOrder(next);
    setSaved(false);
  };

  const persistOrder = () => {
    startTransition(async () => {
      const result = await reorderProducts(order);
      if (result.ok) setSaved(true);
    });
  };

  const orderChanged = order.some((id, i) => products[i]?.id !== id);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو در نام یا شناسه"
          aria-label="جست‌وجوی محصول"
          className={`${inputClass} sm:max-w-xs`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="فیلتر وضعیت"
          className={`${inputClass} sm:max-w-40`}
        >
          <option value="all">همهٔ وضعیت‌ها</option>
          <option value="published">منتشرشده</option>
          <option value="draft">پیش‌نویس</option>
          <option value="sold_out">ناموجود</option>
        </select>
      </div>

      {orderChanged && canReorder && (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-accent/50 px-4 py-3"
          style={{ borderRadius: "var(--radius)" }}
        >
          <span className="text-[13px] text-ink">ترتیب تغییر کرده است.</span>
          <button
            type="button"
            onClick={persistOrder}
            disabled={pending}
            className="type-utility !text-accent hover:underline disabled:opacity-50"
          >
            {pending ? "در حال ذخیره…" : "ذخیرهٔ ترتیب"}
          </button>
        </div>
      )}
      {saved && (
        <p role="status" className="type-utility mt-3">
          ترتیب ذخیره شد.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="mt-8 text-[13px] text-ink-muted">محصولی با این فیلتر پیدا نشد.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {visible.map((product) => {
            const index = order.indexOf(product.id);
            return (
              <li key={product.id} className="flex items-center gap-3 py-3">
                <div
                  className="relative h-16 w-14 shrink-0 overflow-hidden bg-panel"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <FigurePlaceholder seed={product.slug} className="h-full w-full p-1" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/edit?id=${product.id}`}
                    className="type-utility !text-ink hover:!text-accent"
                  >
                    {product.name_fa}
                  </Link>
                  <p className="type-utility mt-1 truncate" dir="ltr">
                    {product.slug}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {formatToman(product.price)} · موجودی {toFa(product.stock)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="type-utility">
                    {STATUS_LABELS[product.status]}
                    {product.is_featured && " · شاخص"}
                  </span>
                  {canReorder && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`انتقال ${product.name_fa} به بالا`}
                        className="px-1.5 text-ink transition-colors hover:text-accent disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === order.length - 1}
                        aria-label={`انتقال ${product.name_fa} به پایین`}
                        className="px-1.5 text-ink transition-colors hover:text-accent disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
