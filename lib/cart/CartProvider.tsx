"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type CartLine, lineKey } from "./types";

/*
 * Cart state, persisted to localStorage.
 *
 * There is no server-side cart: guest checkout means the basket only has to
 * survive a refresh on one device. Anything stored client-side is treated as
 * untrusted input on the way back in — see `parseStored`.
 */

const STORAGE_KEY = "makt.cart.v1";
/** Guards against a typo or a tampered store turning into a huge order. */
const MAX_QUANTITY = 20;

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** True until localStorage has been read, so the UI can avoid flashing. */
  hydrated: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/**
 * Rebuilds the cart from whatever is in storage, discarding anything that does
 * not look like a cart line. A corrupted or hand-edited value must not be able
 * to crash every page that renders the cart badge.
 */
function parseStored(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const lines: CartLine[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.product_id !== "string" || typeof e.slug !== "string") continue;

      const quantity = Number(e.quantity);
      const price = Number(e.price);
      if (!Number.isFinite(quantity) || quantity < 1) continue;
      if (!Number.isFinite(price) || price < 0) continue;

      lines.push({
        product_id: e.product_id,
        slug: e.slug,
        name_fa: typeof e.name_fa === "string" ? e.name_fa : e.slug,
        price: Math.floor(price),
        quantity: Math.min(MAX_QUANTITY, Math.floor(quantity)),
        color_hex: typeof e.color_hex === "string" ? e.color_hex : null,
        color_name_fa: typeof e.color_name_fa === "string" ? e.color_name_fa : null,
        image: typeof e.image === "string" ? e.image : null,
      });
    }
    return lines;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read once on mount rather than during render: the server has no
  // localStorage, and seeding state from it directly would desync hydration.
  useEffect(() => {
    setLines(parseStored(window.localStorage.getItem(STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private browsing or a full quota. Losing persistence is acceptable;
      // breaking the checkout button is not.
    }
  }, [lines, hydrated]);

  // Keep tabs in sync — a cart edited in one tab should not be silently
  // overwritten by a stale copy in another.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setLines(parseStored(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setLines((current) => {
      const key = lineKey(line);
      const existing = current.find((l) => lineKey(l) === key);
      if (existing) {
        return current.map((l) =>
          lineKey(l) === key
            ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + quantity) }
            : l,
        );
      }
      return [...current, { ...line, quantity: Math.min(MAX_QUANTITY, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) => {
      if (quantity < 1) return current.filter((l) => lineKey(l) !== key);
      return current.map((l) =>
        lineKey(l) === key ? { ...l, quantity: Math.min(MAX_QUANTITY, quantity) } : l,
      );
    });
  }, []);

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((l) => lineKey(l) !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    return { lines, count, subtotal, hydrated, add, setQuantity, remove, clear };
  }, [lines, hydrated, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
