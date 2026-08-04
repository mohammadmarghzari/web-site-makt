import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/*
 * Session refresh and admin gate.
 *
 * Next 16 renamed this file convention from `middleware` to `proxy`; the
 * behaviour is unchanged.
 *
 * Server Components cannot write cookies, so a rotated access token would be
 * dropped without this: the proxy refreshes on every request and writes the
 * new cookies onto both the forwarded request and the outgoing response.
 *
 * The gate here is only the first of two. This checks that *someone* is signed
 * in; it deliberately does not read the user's role, because that would mean a
 * database round-trip on every request. The role is enforced in the admin
 * layout, and again by RLS on every write — a signed-in non-admin gets past
 * this line and no further.
 */

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p));

  // Without Supabase there is no auth at all. Sending visitors to a login page
  // they cannot use would be a dead end, so the admin area explains itself
  // instead — see app/admin/layout.tsx.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Must run before any redirect decision: this call is what performs the
  // refresh and populates the Set-Cookie headers above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminRoute && !isPublicAdminPath && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    // Remember where they were headed so login can send them back.
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  /*
   * Everything except static assets and image files. Running the refresh on
   * every font and icon request would triple the auth traffic for no benefit.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
