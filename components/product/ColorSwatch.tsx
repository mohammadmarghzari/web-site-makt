"use client";

import type { ProductColor } from "@/lib/types";

/*
 * Circular colour swatches.
 *
 * Two modes: a static read-only row on product cards, and a selectable row in
 * the hero. Selection is communicated with `aria-pressed` and a ring rather
 * than colour alone, since several swatches in this palette differ by only a
 * few percent of luminance.
 */

export function ColorSwatchRow({ colors }: { colors: ProductColor[] }) {
  if (colors.length === 0) return null;
  return (
    <ul className="flex items-center gap-1.5" aria-label="رنگ‌های موجود">
      {colors.map((color) => (
        <li key={color.hex}>
          <span
            className="block h-3 w-3 rounded-full border border-line"
            style={{ backgroundColor: color.hex }}
            title={color.name_fa}
          />
          <span className="sr-only">{color.name_fa}</span>
        </li>
      ))}
    </ul>
  );
}

export function ColorSwatchPicker({
  colors,
  selected,
  onSelect,
}: {
  colors: ProductColor[];
  selected: string;
  onSelect: (hex: string) => void;
}) {
  if (colors.length === 0) return null;
  return (
    <div className="flex items-center gap-2.5" role="group" aria-label="انتخاب رنگ">
      {colors.map((color) => {
        const isSelected = color.hex === selected;
        return (
          <button
            key={color.hex}
            type="button"
            onClick={() => onSelect(color.hex)}
            aria-pressed={isSelected}
            className={[
              "relative flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-300",
              isSelected ? "scale-110" : "hover:scale-105",
            ].join(" ")}
          >
            <span
              className={[
                "block h-4 w-4 rounded-full border",
                isSelected ? "border-accent" : "border-line",
              ].join(" ")}
              style={{ backgroundColor: color.hex }}
            />
            {isSelected && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-accent/70"
              />
            )}
            <span className="sr-only">{color.name_fa}</span>
          </button>
        );
      })}
    </div>
  );
}
