import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser, isAdmin } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";
import { Bracket } from "@/components/ui/Bracket";
import { SignOutButton } from "@/components/admin/SignOutButton";

export const metadata: Metadata = {
  title: "پنل مدیریت",
  // The admin area must never appear in search results.
  robots: { index: false, follow: false, nocache: true },
};

/*
 * Admin shell.
 *
 * The second half of the auth gate. Middleware already turned away anyone who
 * is not signed in; this is where the *role* is checked, because a signed-in
 * customer must not see the panel either. RLS is the third layer and the only
 * one that actually protects the data — these two exist to give a readable
 * answer instead of a wall of policy errors.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentUser() : null;
  const admin = configured && user ? await isAdmin() : false;

  return (
    <div className="min-h-[100dvh] bg-bg-deep">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <div>
            <Bracket>پنل مدیریت</Bracket>
            <p className="type-display mt-2 text-2xl" dir="ltr">
              MAKT
            </p>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/" className="type-utility transition-colors hover:!text-accent">
              دیدن سایت ↗
            </Link>
            {user && <SignOutButton />}
          </div>
        </header>

        {!configured ? (
          <NotConfigured />
        ) : !user ? (
          // Only reachable on /admin/login, which middleware lets through.
          <main className="py-10">{children}</main>
        ) : !admin ? (
          <NotAuthorised email={user.email ?? ""} />
        ) : (
          <>
            <AdminNav />
            <main className="py-8">{children}</main>
          </>
        )}
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <main className="py-16">
      <h1 className="type-display text-3xl">دیتابیس هنوز وصل نشده</h1>
      <p className="mt-5 max-w-lg text-sm leading-loose text-ink-muted">
        سایت الان روی دادهٔ نمونه کار می‌کند و پنل مدیریت تا وصل‌شدن Supabase فعال
        نمی‌شود. برای فعال‌کردنش:
      </p>
      <ol className="mt-6 max-w-lg space-y-3 text-sm leading-relaxed text-ink-muted">
        <li>
          <span className="type-utility !text-ink">۱ —</span> در supabase.com یک پروژهٔ
          رایگان بسازید.
        </li>
        <li>
          <span className="type-utility !text-ink">۲ —</span> فایل{" "}
          <code dir="ltr" className="text-ink">
            supabase/migrations/0001_init.sql
          </code>{" "}
          را در SQL Editor پیست و اجرا کنید.
        </li>
        <li>
          <span className="type-utility !text-ink">۳ —</span> سه متغیر Supabase را در
          تنظیمات Vercel وارد کنید و دوباره دیپلوی کنید.
        </li>
      </ol>
      <p className="type-utility mt-6">راهنمای کامل در README پروژه هست.</p>
    </main>
  );
}

function NotAuthorised({ email }: { email: string }) {
  return (
    <main className="py-16">
      <h1 className="type-display text-3xl">دسترسی ندارید</h1>
      <p className="mt-5 max-w-lg text-sm leading-loose text-ink-muted">
        با حساب <span dir="ltr" className="text-ink">{email}</span> وارد شده‌اید، ولی این
        حساب نقش مدیر ندارد. در SQL Editor پروژهٔ Supabase این خط را اجرا کنید:
      </p>
      <pre
        dir="ltr"
        className="mt-5 overflow-x-auto border border-line p-4 text-[12px] text-ink"
        style={{ borderRadius: "var(--radius)" }}
      >
        {`update public.profiles set role = 'admin' where email = '${email}';`}
      </pre>
      <p className="type-utility mt-4">بعد یک بار خارج و دوباره وارد شوید.</p>
    </main>
  );
}
