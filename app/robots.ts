import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/payment";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or transactional surfaces. Crawling /checkout/result would
      // also mean crawlers hitting order lookups for no benefit.
      disallow: ["/admin", "/admin/", "/cart", "/checkout", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
