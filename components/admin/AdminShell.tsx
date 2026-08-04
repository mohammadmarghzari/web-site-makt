"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AdminNav } from "./AdminNav";
import { LoginForm } from "./LoginForm";
import { Bracket } from "@/components/ui/Bracket";

/*
 * Admin shell and auth gate.
 *
 * On a static host there is no middleware and no server render, so the gate
 * runs in the browser. That is fine, because this gate is not what protects
 * the data — RLS is. Every query and every write is checked by Postgres
 * against the caller's role, so someone who bypasses this component sees
 * exactly nothing they are not entitled to. What this does is give a readable
 * answer instead of a wall of empty tables and policy errors.
 */

type Gate =
  | { state: "loading" }
  | { state: "unconfigured" }
  | { state: "anonymous" }
  | { state: "forbidden"; email: string }
  | { state: "admin"; email: string };

export function AdminShell({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>({ state: "loading" });
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setGate({ state: "unconfigured" });
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setGate({ state: "unconfigured" });
      return;
    }

    let cancelled = false;

    const evaluate = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (cancelled) return;

      if (!user) {
        setGate({ state: "anonymous" });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      setGate(
        profile?.role === "admin"
          ? { state: "admin", email: user.email ?? "" }
          : { state: "forbidden", email: user.email ?? "" },
      );
    };

    void evaluate();

    // Re-evaluate on sign-in and sign-out so the panel appears and disappears
    // without a manual reload.
    const { data: sub } = supabase.auth.onAuthStateChange(() => void evaluate());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  const signOut = async () => {
    await createClient()?.auth.signOut();
  };

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
            {(gate.state === "admin" || gate.state === "forbidden") && (
              <button
                type="button"
                onClick={() => void signOut()}
                className="type-utility transition-colors hover:!text-accent"
              >
                خروج
              </button>
            )}
          </div>
        </header>

        {gate.state === "loading" && <p className="type-utility py-16">در حال بررسی دسترسی…</p>}
        {gate.state === "unconfigured" && <NotConfigured />}
        {gate.state === "anonymous" && <LoginForm />}
        {gate.state === "forbidden" && <NotAuthorised email={gate.email} />}
        {gate.state === "admin" && (
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
          <span className="type-utility !text-ink">۲ —</span> دو فایل داخل پوشهٔ{" "}
          <code dir="ltr" className="text-ink">
            supabase/migrations/
          </code>{" "}
          را به ترتیب در SQL Editor اجرا کنید.
        </li>
        <li>
          <span className="type-utility !text-ink">۳ —</span> دو کلید Supabase را در
          Secrets مخزن گیت‌هاب بگذارید و یک بار Actions را اجرا کنید.
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
        با حساب{" "}
        <span dir="ltr" className="text-ink">
          {email}
        </span>{" "}
        وارد شده‌اید، ولی این حساب نقش مدیر ندارد. در SQL Editor پروژهٔ Supabase این خط
        را اجرا کنید:
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
