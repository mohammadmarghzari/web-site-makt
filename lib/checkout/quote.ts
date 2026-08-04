import "server-only";

import { getProductsByIds } from "@/lib/repo/products";
import { getSettings } from "@/lib/repo/settings";
import type { OrderItem } from "@/lib/types";
import type { CheckoutInput } from "@/lib/validators";

/*
 * Turns a submitted basket into an authoritative order total.
 *
 * This is the security boundary of the whole checkout: the browser sends only
 * product ids, colours and quantities. Prices, availability and shipping are
 * all resolved here from the database. Nothing the client sends about money is
 * read, so a tampered basket cannot buy a figure for one Toman.
 */

export interface QuoteLineProblem {
  slug: string;
  name_fa: string;
  reason: "missing" | "unavailable" | "insufficient_stock";
  available?: number;
}

export interface Quote {
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  problems: QuoteLineProblem[];
}

export async function buildQuote(input: CheckoutInput): Promise<Quote> {
  const ids = [...new Set(input.lines.map((l) => l.product_id))];
  const [products, settings] = await Promise.all([getProductsByIds(ids), getSettings()]);
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: OrderItem[] = [];
  const problems: QuoteLineProblem[] = [];

  for (const line of input.lines) {
    const product = byId.get(line.product_id);

    if (!product) {
      problems.push({ slug: line.product_id, name_fa: "محصول ناشناخته", reason: "missing" });
      continue;
    }

    if (product.status !== "published") {
      problems.push({
        slug: product.slug,
        name_fa: product.name_fa,
        reason: "unavailable",
      });
      continue;
    }

    if (product.stock < line.quantity) {
      problems.push({
        slug: product.slug,
        name_fa: product.name_fa,
        reason: "insufficient_stock",
        available: product.stock,
      });
      continue;
    }

    // Resolve the colour against the product's real palette rather than
    // trusting the submitted hex, so an order can never record a finish that
    // is not actually offered.
    const color = product.colors.find((c) => c.hex === line.color_hex) ?? null;

    items.push({
      product_id: product.id,
      slug: product.slug,
      name_fa: product.name_fa,
      price: product.price,
      quantity: line.quantity,
      color_hex: color?.hex ?? null,
      color_name_fa: color?.name_fa ?? null,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // No shipping charge on an empty basket — otherwise a fully rejected cart
  // would still quote a postage fee.
  const shipping = items.length > 0 ? settings.shipping_flat_price : 0;

  return { items, subtotal, shipping, total: subtotal + shipping, problems };
}

export function describeProblem(problem: QuoteLineProblem): string {
  switch (problem.reason) {
    case "missing":
      return `«${problem.name_fa}» دیگر در فروشگاه نیست و از سبد حذف شد.`;
    case "unavailable":
      return `«${problem.name_fa}» فعلاً قابل سفارش نیست.`;
    case "insufficient_stock":
      return problem.available && problem.available > 0
        ? `از «${problem.name_fa}» فقط ${problem.available} عدد موجود است.`
        : `«${problem.name_fa}» ناموجود شد.`;
  }
}
