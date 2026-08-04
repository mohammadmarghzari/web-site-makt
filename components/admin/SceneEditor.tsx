"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HeroScene } from "@/lib/types";
import { saveScene } from "@/app/admin/actions";
import { ImageUploader } from "./ImageUploader";
import { ScenePreview } from "./ScenePreview";
import { Field, inputClass } from "@/components/ui/Field";
import { Bracket } from "@/components/ui/Bracket";
import { Button } from "@/components/ui/Button";
import { toFa } from "@/lib/format";

/*
 * Editor for one hero act.
 *
 * Title lines are edited as separate rows rather than one textarea split on
 * newlines: the display type is hand-broken, and where a line ends is a design
 * decision the operator is making deliberately, not an accident of wrapping.
 *
 * The preview beside the form is the real renderer with the real values, so
 * what is approved here is what ships.
 */
export function SceneEditor({ scene, title }: { scene: HeroScene; title: string }) {
  const router = useRouter();
  const [frames, setFrames] = useState<string[]>(scene.frames ?? []);
  const [poster, setPoster] = useState<string[]>(scene.poster_url ? [scene.poster_url] : []);
  const [lines, setLines] = useState<string[]>(
    scene.title_lines.length > 0 ? scene.title_lines : [""],
  );
  const [subtitle, setSubtitle] = useState(scene.subtitle_fa);
  const [ctaLabel, setCtaLabel] = useState(scene.cta_label ?? "");
  const [ctaHref, setCtaHref] = useState(scene.cta_href ?? "");
  const [overlay, setOverlay] = useState(scene.overlay_alpha);

  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setFormError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveScene({
        scene_key: scene.scene_key,
        frames,
        poster_url: poster[0] ?? "",
        title_lines: lines.map((l) => l.trim()).filter(Boolean),
        subtitle_fa: subtitle,
        cta_label: ctaLabel,
        cta_href: ctaHref,
        overlay_alpha: overlay,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-display text-2xl">{title}</h2>
        <span className="type-utility" dir="ltr">
          {scene.scene_key}
        </span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <div>
            <Bracket>خطوط تیتر</Bracket>
            <p className="type-utility mt-1.5">هر خط جدا — شکست خط دست خودتان است.</p>
            <ul className="mt-3 space-y-2">
              {lines.map((line, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="type-utility w-5 shrink-0">{toFa(index + 1)}</span>
                  <input
                    value={line}
                    onChange={(e) =>
                      setLines((current) =>
                        current.map((l, i) => (i === index ? e.target.value : l)),
                      )
                    }
                    aria-label={`خط ${index + 1} تیتر`}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setLines((c) => c.filter((_, i) => i !== index))}
                    disabled={lines.length === 1}
                    aria-label="حذف خط"
                    className="shrink-0 px-2 text-ink-muted transition-colors hover:text-accent disabled:opacity-30"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {lines.length < 5 && (
              <button
                type="button"
                onClick={() => setLines((c) => [...c, ""])}
                className="type-utility mt-3 transition-colors hover:!text-accent"
              >
                + افزودن خط
              </button>
            )}
          </div>

          <Field id={`${scene.scene_key}-subtitle`} label="زیرعنوان">
            <textarea
              id={`${scene.scene_key}-subtitle`}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
              className={`${inputClass} resize-y`}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${scene.scene_key}-cta-label`} label="متن دکمه">
              <input
                id={`${scene.scene_key}-cta-label`}
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              id={`${scene.scene_key}-cta-href`}
              label="نشانی دکمه"
              hint="مثل /product/arash یا ‎#act-2"
            >
              <input
                id={`${scene.scene_key}-cta-href`}
                value={ctaHref}
                onChange={(e) => setCtaHref(e.target.value)}
                dir="ltr"
                className={`${inputClass} text-start`}
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <Bracket>شدت تیرگی روی تصویر</Bracket>
              <span className="type-utility !text-ink">{toFa(Math.round(overlay * 100))}٪</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={overlay}
              onChange={(e) => setOverlay(Number(e.target.value))}
              aria-label="شدت تیرگی"
              className="mt-3 w-full accent-[#E4EDF2]"
            />
            <p className="type-utility mt-1.5">
              هرچه بیشتر، متن روی تصویر خواناتر — ولی تصویر تیره‌تر.
            </p>
          </div>

          <ImageUploader
            bucket="hero-frames"
            pathPrefix={`${scene.scene_key}/frames`}
            value={frames}
            onChange={setFrames}
            label="فریم‌های دنبالهٔ عکس"
            hint="به ترتیب نام فایل مرتب می‌شوند. پیشنهاد: ۹۶ فریم دسکتاپ، ۴۸ فریم موبایل."
            max={240}
          />

          <ImageUploader
            bucket="hero-frames"
            pathPrefix={`${scene.scene_key}/poster`}
            value={poster}
            onChange={(next) => setPoster(next.slice(-1))}
            label="تصویر پوستر"
            hint="قبل از آماده‌شدن فریم‌ها و در حالت کاهش حرکت نشان داده می‌شود."
            max={1}
          />

          {formError && (
            <p role="alert" className="type-utility !text-accent">
              {formError}
            </p>
          )}
          {saved && (
            <p role="status" className="type-utility">
              ذخیره شد.
            </p>
          )}

          <Button onClick={submit} disabled={pending}>
            {pending ? "در حال ذخیره…" : "ذخیرهٔ پرده"}
          </Button>
        </div>

        <div className="lg:sticky lg:top-6">
          <Bracket>پیش‌نمایش زنده</Bracket>
          <div className="mt-3">
            <ScenePreview
              titleLines={lines.filter((l) => l.trim())}
              subtitle={subtitle}
              ctaLabel={ctaLabel}
              overlayAlpha={overlay}
              frames={frames}
              poster={poster[0] ?? null}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
