"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { submitCheckout } from "@/app/checkout/actions";
import { customerSchema } from "@/lib/validators";
import { Field, inputClass } from "@/components/ui/Field";
import { Bracket } from "@/components/ui/Bracket";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatToman, toFa } from "@/lib/format";

/*
 * Guest checkout form.
 *
 * Validated with the same Zod schema the server action uses, so the two can
 * never drift apart. Client validation here is only to give fast feedback —
 * the server revalidates and re-prices regardless.
 */

const FIELDS = ["name", "phone", "address", "postal_code"] as const;
type FieldName = (typeof FIELDS)[number];

export function CheckoutForm({
  shippingFlatPrice,
  mockPayment,
}: {
  shippingFlatPrice: number;
  mockPayment: boolean;
}) {
  const { lines, subtotal, hydrated, clear } = useCart();
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  if (!hydrated) return <div className="min-h-[40dvh]" aria-hidden="true" />;

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center">
        <Bracket>تکمیل سفارش</Bracket>
        <p className="type-display text-3xl">سبد خالی است</p>
        <ButtonLink href="/#act-2" tone="outline">
          دیدن کاتالوگ
        </ButtonLink>
      </div>
    );
  }

  const total = subtotal + shippingFlatPrice;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setProblems([]);

    const formData = new FormData(event.currentTarget);
    const customer = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      address: String(formData.get("address") ?? ""),
      postal_code: String(formData.get("postal_code") ?? ""),
      note: String(formData.get("note") ?? ""),
    };

    const parsed = customerSchema.safeParse(customer);
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldName;
        if (FIELDS.includes(key) && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      // Move focus to the first problem so the customer is not left guessing
      // which field is wrong on a long mobile form.
      const firstBad = FIELDS.find((f) => next[f]);
      if (firstBad) document.getElementById(firstBad)?.focus();
      return;
    }

    setErrors({});

    startTransition(async () => {
      const result = await submitCheckout({
        customer: parsed.data,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
          color_hex: l.color_hex,
        })),
      });

      if (!result.ok) {
        setFormError(result.error);
        setProblems(result.problems ?? []);
        return;
      }

      // The order is recorded server-side, so the basket has done its job.
      // Clearing before the redirect avoids a stale cart if the customer
      // navigates back from the gateway.
      clear();
      window.location.href = result.redirectUrl;
    });
  };

  return (
    <>
      <nav className="mb-8 flex items-center justify-between gap-4">
        <Link href="/cart" className="type-utility transition-colors hover:!text-accent">
          ← بازگشت به سبد
        </Link>
        <Bracket>تکمیل سفارش</Bracket>
      </nav>

      <h1 className="type-display text-4xl sm:text-5xl">تکمیل سفارش</h1>

      {mockPayment && (
        <p
          className="type-utility mt-5 border border-line px-4 py-3 leading-relaxed"
          style={{ borderRadius: "var(--radius)" }}
          role="status"
        >
          حالت آزمایشی — پرداخت واقعی انجام نمی‌شود و هیچ مبلغی از حساب شما کم نمی‌شود.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-5">
          <Field id="name" label="نام و نام خانوادگی" error={errors.name}>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className={inputClass}
              aria-describedby={errors.name ? "name-error" : undefined}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            id="phone"
            label="شمارهٔ موبایل"
            error={errors.phone}
            hint="مثل ۰۹۱۲۳۴۵۶۷۸۹ — با ارقام فارسی هم می‌توانید بنویسید"
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              dir="ltr"
              className={`${inputClass} text-start`}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>

          <Field id="address" label="نشانی کامل" error={errors.address}>
            <textarea
              id="address"
              name="address"
              rows={3}
              autoComplete="street-address"
              className={`${inputClass} resize-y`}
              aria-describedby={errors.address ? "address-error" : undefined}
              aria-invalid={Boolean(errors.address)}
            />
          </Field>

          <Field id="postal_code" label="کد پستی" error={errors.postal_code} hint="۱۰ رقم، بدون خط تیره">
            <input
              id="postal_code"
              name="postal_code"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              dir="ltr"
              className={`${inputClass} text-start`}
              aria-describedby={errors.postal_code ? "postal_code-error" : "postal_code-hint"}
              aria-invalid={Boolean(errors.postal_code)}
            />
          </Field>

          <Field id="note" label="یادداشت برای ما (اختیاری)">
            <textarea id="note" name="note" rows={2} className={`${inputClass} resize-y`} />
          </Field>
        </div>

        <aside
          className="border border-line p-5 lg:sticky lg:top-6"
          style={{ borderRadius: "var(--radius)" }}
        >
          <Bracket>خلاصهٔ سفارش</Bracket>

          <ul className="mt-4 space-y-2 border-t border-line pt-4 text-[13px]">
            {lines.map((line) => (
              <li key={`${line.product_id}-${line.color_hex}`} className="flex justify-between gap-3">
                <span className="min-w-0 text-ink-muted">
                  {line.name_fa}
                  {line.quantity > 1 && ` × ${toFa(line.quantity)}`}
                </span>
                <span className="shrink-0 text-ink">{formatToman(line.price * line.quantity)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">جمع کالاها</dt>
              <dd className="text-ink">{formatToman(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">هزینهٔ ارسال</dt>
              <dd className="text-ink">
                {shippingFlatPrice > 0 ? formatToman(shippingFlatPrice) : "رایگان"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex justify-between border-t border-line pt-4">
            <span className="type-utility !text-ink">مبلغ نهایی</span>
            <span className="text-base text-ink">{formatToman(total)}</span>
          </div>

          {formError && (
            <div
              role="alert"
              className="mt-5 border border-accent/60 px-3 py-2.5"
              style={{ borderRadius: "var(--radius)" }}
            >
              <p className="text-[13px] text-ink">{formError}</p>
              {problems.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {problems.map((problem) => (
                    <li key={problem} className="type-utility">
                      {problem}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? "در حال انتقال…" : "پرداخت"}
            </Button>
          </div>
        </aside>
      </form>
    </>
  );
}
