/*
 * Persian number and price formatting.
 *
 * `Intl.NumberFormat("fa-IR")` already emits Persian digits and the correct
 * `٬` thousands separator, so these helpers lean on it rather than
 * hand-rolling a digit map. The results are deterministic, which matters:
 * these run on both server and client and any divergence would surface as a
 * hydration mismatch.
 */

const faDecimal = new Intl.NumberFormat("fa-IR");
const faDecimalPlain = new Intl.NumberFormat("fa-IR", { useGrouping: false });

/** 1290000 → «۱٬۲۹۰٬۰۰۰» */
export function toFa(value: number): string {
  return faDecimal.format(value);
}

/** 7 → «۰۷» — used by the act rail and thumbnail counters. */
export function toFaPadded(value: number, width = 2): string {
  return faDecimalPlain.format(value).padStart(width, "۰");
}

/** 1290000 → «۱٬۲۹۰٬۰۰۰ تومان» */
export function formatToman(value: number): string {
  return `${toFa(value)} تومان`;
}

/**
 * Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII.
 *
 * Iranian keyboards produce Persian digits, so a phone number or postal code
 * typed naturally will not match a `\d` pattern. Every numeric form field is
 * normalised through this before validation — without it, correct input gets
 * rejected and the customer has no idea why.
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    // Persian ۰ is U+06F0, Arabic-Indic ٠ is U+0660.
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * Discount percentage, rounded down so the badge never overstates the saving.
 * Returns null when there is nothing to advertise.
 */
export function discountPercent(price: number, comparePrice: number | null): number | null {
  if (!comparePrice || comparePrice <= price) return null;
  return Math.floor(((comparePrice - price) / comparePrice) * 100);
}
