import type { MetadataRoute } from "next";
import { getPublishedProducts } from "@/lib/repo/products";
import { getSiteUrl } from "@/lib/payment";

/*
 * Sitemap.
 *
 * Only public, indexable routes belong here — cart, checkout and the admin
 * panel are all marked noindex and are deliberately absent.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const products = await getPublishedProducts();

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: new Date(product.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
