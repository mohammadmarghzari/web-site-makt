import type { ReactNode } from "react";

/*
 * Form field wrapper.
 *
 * The error is tied to the input with `aria-describedby` and announced via
 * `role="alert"`, so a screen-reader user hears why a submission failed rather
 * than being told only that it did.
 */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="type-utility !text-ink">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint && !error && (
        <p id={`${id}-hint`} className="type-utility mt-1.5">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="type-utility mt-1.5 !text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared input styling, kept in one place so every form field matches. */
export const inputClass =
  "w-full border border-line bg-bg-deep/25 px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none";
