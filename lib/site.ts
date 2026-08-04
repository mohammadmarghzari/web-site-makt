/**
 * Canonical public URL of the site.
 *
 * Used to build absolute URLs for the sitemap and metadata. On GitHub Pages
 * this is the project page URL including the repository sub-path; set
 * `NEXT_PUBLIC_SITE_URL` at build time to override it for a custom domain.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://mohammadmarghzari.github.io/web-site-makt";
}

/** Sub-path the app is served from, or "" at a domain root. */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}
