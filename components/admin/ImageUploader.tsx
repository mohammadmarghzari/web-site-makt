"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Bracket } from "@/components/ui/Bracket";
import { toFa } from "@/lib/format";

/*
 * Multi-image uploader with reordering.
 *
 * Files go straight from the browser to Supabase Storage rather than through a
 * Server Action. That is not a preference: Vercel caps a Server Action request
 * body at a few megabytes, which a handful of product photos clears easily.
 * Uploading direct also keeps the progress indicator honest.
 *
 * Order matters — the first image is the one the catalogue card shows — so the
 * list is reorderable rather than a bare gallery.
 */

interface UploadState {
  name: string;
  progress: number;
  error?: string;
}

export function ImageUploader({
  bucket,
  pathPrefix,
  value,
  onChange,
  label = "تصاویر",
  hint,
  max = 12,
}: {
  bucket: string;
  pathPrefix: string;
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  hint?: string;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("آپلود نیاز به اتصال Supabase دارد.");
      return;
    }

    const room = max - value.length;
    if (room <= 0) {
      setError(`حداکثر ${toFa(max)} فایل مجاز است.`);
      return;
    }

    // Sorted by filename so a numbered sequence (frame-0001, frame-0002, …)
    // keeps its intended order regardless of how the OS hands them over.
    const chosen = [...files].sort((a, b) => a.name.localeCompare(b.name)).slice(0, room);
    setUploads(chosen.map((f) => ({ name: f.name, progress: 0 })));

    const uploaded: string[] = [];

    for (const [index, file] of chosen.entries()) {
      // Random prefix keeps two files with the same name from colliding, and
      // stops a guessable path from being overwritten.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${pathPrefix}/${Date.now()}-${index}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      setUploads((current) =>
        current.map((u, i) =>
          i === index
            ? { ...u, progress: 100, error: uploadError ? uploadError.message : undefined }
            : u,
        ),
      );

      if (uploadError) continue;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }

    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    setTimeout(() => setUploads([]), 1200);
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Bracket>{label}</Bracket>
        <span className="type-utility">
          {toFa(value.length)} / {toFa(max)}
        </span>
      </div>
      {hint && <p className="type-utility mt-1.5">{hint}</p>}

      {value.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, index) => (
            <li
              key={url}
              className="relative overflow-hidden border border-line"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="relative aspect-square bg-panel">
                <Image src={url} alt="" fill sizes="120px" className="object-cover" />
                {index === 0 && (
                  <span className="type-utility absolute top-1 bg-bg-deep/85 px-1.5 py-0.5 !text-ink" style={{ insetInlineStart: "0.25rem" }}>
                    اصلی
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-line px-1 py-1">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label="جابه‌جایی به قبل"
                  className="px-1.5 text-ink transition-colors hover:text-accent disabled:opacity-30"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label="حذف تصویر"
                  className="type-utility px-1 transition-colors hover:!text-accent"
                >
                  حذف
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === value.length - 1}
                  aria-label="جابه‌جایی به بعد"
                  className="px-1.5 text-ink transition-colors hover:text-accent disabled:opacity-30"
                >
                  ‹
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-live="polite">
          {uploads.map((upload) => (
            <li key={upload.name} className="flex items-center gap-2">
              <span className="h-1 flex-1 bg-line">
                <span
                  className="block h-1 bg-accent transition-[width] duration-300"
                  style={{ width: `${upload.progress}%` }}
                />
              </span>
              <span className="type-utility max-w-[45%] truncate" dir="ltr">
                {upload.error ? "خطا" : upload.name}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="type-utility mt-2 !text-accent">
          {error}
        </p>
      )}

      <label
        className="mt-3 flex cursor-pointer items-center justify-center border border-dashed border-line px-4 py-4 text-[13px] text-ink-muted transition-colors hover:border-accent hover:text-ink"
        style={{ borderRadius: "var(--radius)" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        افزودن فایل
      </label>
    </div>
  );
}
