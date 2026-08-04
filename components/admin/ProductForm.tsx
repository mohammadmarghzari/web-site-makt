"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductColor } from "@/lib/types";
import { deleteProduct, saveProduct } from "@/lib/admin/mutations";
import { ImageUploader } from "./ImageUploader";
import { Field, inputClass } from "@/components/ui/Field";
import { Bracket } from "@/components/ui/Bracket";
import { Button } from "@/components/ui/Button";

/*
 * Product create/edit form.
 *
 * Arrays (images, colours, accessories) are held in React state rather than
 * plain inputs because they need structure a form field cannot express. Scalar
 * fields stay uncontrolled and are read from FormData on submit — fewer
 * re-renders, and the browser keeps its own autofill and validation behaviour.
 */

const EMPTY_COLOR: ProductColor = { name_fa: "", hex: "#c9d3da" };

export function ProductForm({ product }: { product: Product | null }) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [colors, setColors] = useState<ProductColor[]>(product?.colors ?? []);
  const [accessories, setAccessories] = useState<string[]>(product?.accessories ?? []);
  const [accessoryDraft, setAccessoryDraft] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, startDeleting] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.currentTarget);

    const payload = {
      slug: String(formData.get("slug") ?? ""),
      name_fa: String(formData.get("name_fa") ?? ""),
      name_en: String(formData.get("name_en") ?? ""),
      tagline_fa: String(formData.get("tagline_fa") ?? ""),
      description_fa: String(formData.get("description_fa") ?? ""),
      price: formData.get("price"),
      compare_price: formData.get("compare_price"),
      images,
      colors,
      scale: String(formData.get("scale") ?? "1/12"),
      height_cm: formData.get("height_cm"),
      material: String(formData.get("material") ?? ""),
      articulation: formData.get("articulation"),
      accessories,
      stock: formData.get("stock"),
      status: String(formData.get("status") ?? "draft"),
      is_featured: formData.get("is_featured") === "on",
      sort_order: formData.get("sort_order"),
    };

    startTransition(async () => {
      const result = await saveProduct(product?.id ?? null, payload);
      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setFieldErrors({});
      router.push("/admin/products");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!product) return;
    startDeleting(async () => {
      const result = await deleteProduct(product.id);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <section className="space-y-5">
          <Bracket>پایه</Bracket>

          <Field id="name_fa" label="نام فارسی" error={fieldErrors.name_fa}>
            <input id="name_fa" name="name_fa" defaultValue={product?.name_fa} className={inputClass} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="name_en" label="نام انگلیسی" error={fieldErrors.name_en}>
              <input
                id="name_en"
                name="name_en"
                dir="ltr"
                defaultValue={product?.name_en}
                className={`${inputClass} text-start`}
              />
            </Field>

            <Field
              id="slug"
              label="شناسهٔ نشانی"
              error={fieldErrors.slug}
              hint="فقط حروف کوچک انگلیسی، عدد و خط تیره"
            >
              <input
                id="slug"
                name="slug"
                dir="ltr"
                defaultValue={product?.slug}
                className={`${inputClass} text-start`}
              />
            </Field>
          </div>

          <Field id="tagline_fa" label="توضیح یک‌خطی" error={fieldErrors.tagline_fa}>
            <input
              id="tagline_fa"
              name="tagline_fa"
              defaultValue={product?.tagline_fa}
              className={inputClass}
            />
          </Field>

          <Field id="description_fa" label="توضیح کامل" error={fieldErrors.description_fa}>
            <textarea
              id="description_fa"
              name="description_fa"
              rows={4}
              defaultValue={product?.description_fa}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </section>

        <section className="space-y-5 border-t border-line pt-8">
          <Bracket>قیمت و موجودی</Bracket>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="price" label="قیمت (تومان)" error={fieldErrors.price}>
              <input
                id="price"
                name="price"
                inputMode="numeric"
                dir="ltr"
                defaultValue={product?.price}
                className={`${inputClass} text-start`}
              />
            </Field>

            <Field
              id="compare_price"
              label="قیمت قبل از تخفیف"
              error={fieldErrors.compare_price}
              hint="خالی بگذارید اگر تخفیفی نیست"
            >
              <input
                id="compare_price"
                name="compare_price"
                inputMode="numeric"
                dir="ltr"
                defaultValue={product?.compare_price ?? ""}
                className={`${inputClass} text-start`}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="stock" label="موجودی" error={fieldErrors.stock}>
              <input
                id="stock"
                name="stock"
                inputMode="numeric"
                dir="ltr"
                defaultValue={product?.stock ?? 0}
                className={`${inputClass} text-start`}
              />
            </Field>

            <Field id="status" label="وضعیت" error={fieldErrors.status}>
              <select
                id="status"
                name="status"
                defaultValue={product?.status ?? "draft"}
                className={inputClass}
              >
                <option value="draft">پیش‌نویس</option>
                <option value="published">منتشرشده</option>
                <option value="sold_out">ناموجود</option>
              </select>
            </Field>

            <Field id="sort_order" label="ترتیب" error={fieldErrors.sort_order}>
              <input
                id="sort_order"
                name="sort_order"
                inputMode="numeric"
                dir="ltr"
                defaultValue={product?.sort_order ?? 99}
                className={`${inputClass} text-start`}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={product?.is_featured}
              className="h-4 w-4 accent-[#E4EDF2]"
            />
            <span className="text-[13px] text-ink">فیگور شاخص پردهٔ ۱</span>
          </label>
          <p className="type-utility">
            با فعال‌کردن این گزینه، پرچم فیگور شاخص از بقیهٔ محصولات برداشته می‌شود.
          </p>
        </section>

        <section className="space-y-5 border-t border-line pt-8">
          <Bracket>مشخصات فنی</Bracket>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="scale" label="مقیاس" error={fieldErrors.scale}>
              <input
                id="scale"
                name="scale"
                dir="ltr"
                defaultValue={product?.scale ?? "1/12"}
                className={`${inputClass} text-start`}
              />
            </Field>

            <Field id="height_cm" label="قد (سانتی‌متر)" error={fieldErrors.height_cm}>
              <input
                id="height_cm"
                name="height_cm"
                inputMode="decimal"
                dir="ltr"
                defaultValue={product?.height_cm ?? 0}
                className={`${inputClass} text-start`}
              />
            </Field>

            <Field id="material" label="جنس" error={fieldErrors.material}>
              <input
                id="material"
                name="material"
                defaultValue={product?.material}
                className={inputClass}
              />
            </Field>

            <Field id="articulation" label="تعداد مفصل" error={fieldErrors.articulation}>
              <input
                id="articulation"
                name="articulation"
                inputMode="numeric"
                dir="ltr"
                defaultValue={product?.articulation ?? ""}
                className={`${inputClass} text-start`}
              />
            </Field>
          </div>

          <div>
            <Bracket>لوازم همراه</Bracket>
            {accessories.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {accessories.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex items-center gap-2 border border-line px-2.5 py-1"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <span className="type-utility !text-ink">{item}</span>
                    <button
                      type="button"
                      onClick={() => setAccessories((a) => a.filter((_, i) => i !== index))}
                      aria-label={`حذف ${item}`}
                      className="text-ink-muted transition-colors hover:text-accent"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <input
                value={accessoryDraft}
                onChange={(e) => setAccessoryDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter inside a sub-field must add an item, not submit the
                  // whole product form.
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const value = accessoryDraft.trim();
                  if (!value) return;
                  setAccessories((a) => [...a, value]);
                  setAccessoryDraft("");
                }}
                placeholder="مثلاً: پایهٔ نمایش"
                aria-label="افزودن لوازم همراه"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="space-y-5 border-t border-line pt-8">
          <ColorEditor colors={colors} onChange={setColors} />
        </section>

        <section className="border-t border-line pt-8">
          <ImageUploader
            bucket="product-images"
            pathPrefix={product?.slug || "new"}
            value={images}
            onChange={setImages}
            hint="اولین تصویر، عکس اصلی کارت محصول است."
          />
        </section>

        {formError && (
          <p role="alert" className="type-utility !text-accent">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
          <Button type="submit" disabled={pending}>
            {pending ? "در حال ذخیره…" : "ذخیره"}
          </Button>
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="type-utility transition-colors hover:!text-accent"
          >
            انصراف
          </button>
        </div>
      </form>

      {product && (
        <section className="mt-12 border-t border-line pt-8">
          <Bracket>حذف محصول</Bracket>
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-muted">
            برای حذف، نام فارسی محصول را دقیقاً تایپ کنید:{" "}
            <span className="text-ink">{product.name_fa}</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              aria-label="تأیید نام محصول برای حذف"
              className={`${inputClass} sm:max-w-xs`}
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteConfirm.trim() !== product.name_fa || deleting}
              className="border border-line px-4 py-2.5 text-[13px] text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "var(--radius)" }}
            >
              {deleting ? "…" : "حذف قطعی"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function ColorEditor({
  colors,
  onChange,
}: {
  colors: ProductColor[];
  onChange: (next: ProductColor[]) => void;
}) {
  const update = (index: number, patch: Partial<ProductColor>) =>
    onChange(colors.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div>
      <Bracket>رنگ‌ها</Bracket>
      {colors.length > 0 && (
        <ul className="mt-3 space-y-2">
          {colors.map((color, index) => (
            <li key={index} className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(color.hex) ? color.hex : "#c9d3da"}
                onChange={(e) => update(index, { hex: e.target.value })}
                aria-label="انتخاب رنگ"
                className="h-9 w-10 shrink-0 cursor-pointer border border-line bg-transparent"
              />
              <input
                value={color.name_fa}
                onChange={(e) => update(index, { name_fa: e.target.value })}
                placeholder="نام رنگ"
                aria-label="نام رنگ"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => onChange(colors.filter((_, i) => i !== index))}
                aria-label="حذف رنگ"
                className="shrink-0 px-2 text-ink-muted transition-colors hover:text-accent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => onChange([...colors, { ...EMPTY_COLOR }])}
        className="type-utility mt-3 transition-colors hover:!text-accent"
      >
        + افزودن رنگ
      </button>
    </div>
  );
}
