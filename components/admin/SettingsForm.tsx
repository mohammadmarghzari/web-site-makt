"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/types";
import { saveSettings } from "@/app/admin/actions";
import { ImageUploader } from "./ImageUploader";
import { Field, inputClass } from "@/components/ui/Field";
import { Bracket } from "@/components/ui/Bracket";
import { Button } from "@/components/ui/Button";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [logo, setLogo] = useState<string[]>(settings.logo_url ? [settings.logo_url] : []);
  const [socials, setSocials] = useState(settings.socials);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSaved(false);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveSettings({
        brand_name: String(formData.get("brand_name") ?? ""),
        logo_url: logo[0] ?? "",
        // Rows left half-filled are dropped rather than rejected — an empty
        // trailing row is a normal state while editing, not an error.
        socials: socials.filter((s) => s.label.trim() && s.href.trim()),
        footer_note: String(formData.get("footer_note") ?? ""),
        shipping_flat_price: formData.get("shipping_flat_price"),
      });

      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setFieldErrors({});
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <Field id="brand_name" label="نام برند" error={fieldErrors.brand_name}>
        <input
          id="brand_name"
          name="brand_name"
          defaultValue={settings.brand_name}
          dir="ltr"
          className={`${inputClass} text-start`}
        />
      </Field>

      <Field id="footer_note" label="یادداشت فوتر" error={fieldErrors.footer_note}>
        <input
          id="footer_note"
          name="footer_note"
          defaultValue={settings.footer_note}
          className={inputClass}
        />
      </Field>

      <Field
        id="shipping_flat_price"
        label="هزینهٔ ارسال (تومان)"
        error={fieldErrors.shipping_flat_price}
        hint="صفر بگذارید تا ارسال رایگان شود"
      >
        <input
          id="shipping_flat_price"
          name="shipping_flat_price"
          inputMode="numeric"
          dir="ltr"
          defaultValue={settings.shipping_flat_price}
          className={`${inputClass} text-start`}
        />
      </Field>

      <div>
        <Bracket>شبکه‌های اجتماعی</Bracket>
        <ul className="mt-3 space-y-2">
          {socials.map((social, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2">
              <input
                value={social.label}
                onChange={(e) =>
                  setSocials((c) =>
                    c.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)),
                  )
                }
                placeholder="نام"
                aria-label="نام شبکه"
                className={`${inputClass} sm:max-w-32`}
              />
              <input
                value={social.href}
                onChange={(e) =>
                  setSocials((c) =>
                    c.map((s, i) => (i === index ? { ...s, href: e.target.value } : s)),
                  )
                }
                placeholder="https://…"
                aria-label="نشانی"
                dir="ltr"
                className={`${inputClass} flex-1 text-start`}
              />
              <button
                type="button"
                onClick={() => setSocials((c) => c.filter((_, i) => i !== index))}
                aria-label="حذف"
                className="px-2 text-ink-muted transition-colors hover:text-accent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setSocials((c) => [...c, { label: "", href: "" }])}
          className="type-utility mt-3 transition-colors hover:!text-accent"
        >
          + افزودن شبکه
        </button>
      </div>

      <ImageUploader
        bucket="product-images"
        pathPrefix="brand"
        value={logo}
        onChange={(next) => setLogo(next.slice(-1))}
        label="لوگو"
        max={1}
      />

      {formError && (
        <p role="alert" className="type-utility !text-accent">
          {formError}
        </p>
      )}
      {saved && (
        <p role="status" className="type-utility">
          تنظیمات ذخیره شد.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "در حال ذخیره…" : "ذخیرهٔ تنظیمات"}
      </Button>
    </form>
  );
}
