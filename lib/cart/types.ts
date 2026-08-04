/**
 * A line in the shopping cart.
 *
 * `price` and `image` are carried purely so the cart can render without
 * re-fetching. They are display values and are never trusted: checkout
 * recomputes every amount from the database before an order is created.
 */
export interface CartLine {
  product_id: string;
  slug: string;
  name_fa: string;
  price: number;
  quantity: number;
  color_hex: string | null;
  color_name_fa: string | null;
  image: string | null;
}

/**
 * Identity of a cart line.
 *
 * Colour is part of the key: the same figure in two finishes is two lines, not
 * a quantity of two.
 */
export function lineKey(line: Pick<CartLine, "product_id" | "color_hex">): string {
  return `${line.product_id}::${line.color_hex ?? "-"}`;
}
