import type { NextConfig } from "next";

/*
 * Static export, for GitHub Pages.
 *
 * Pages serves files and nothing else — no Node process, so Server Actions,
 * Route Handlers and middleware simply do not exist at runtime. Everything
 * that used to run on a server now runs either at build time (page rendering)
 * or in the browser (auth, data, orders), with Postgres itself enforcing the
 * rules that a server used to.
 *
 * `basePath` is required because Pages serves the project from a repository
 * sub-path, not a domain root. Without it every asset and link would resolve
 * one level too high and the deployed site would render unstyled.
 */

// A user/organisation Pages site (`<user>.github.io`) is served from the root,
// so the sub-path must not be applied there. A custom domain is the same case.
const repoName = "web-site-makt";
const basePath = process.env.PAGES_BASE_PATH ?? `/${repoName}`;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Pages has no server to resolve extension-less URLs, so every route is
  // emitted as its own directory with an index.html inside.
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    // next/image optimisation needs a running server. Static export must ship
    // the original files and let the browser do the work.
    unoptimized: true,
  },
  env: {
    // Read by client code that has to build absolute URLs to its own assets.
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
