"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validators";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Bracket } from "@/components/ui/Bracket";

/*
 * Admin sign-in and first-time registration.
 *
 * Both live on one form because there is exactly one operator: making them
 * hunt for a separate "register" page the first time would be pure friction.
 *
 * A new account has the `customer` role — signing up does not grant access.
 * Promotion to admin is a deliberate SQL statement, so an exposed URL cannot
 * be used to mint an administrator.
 */
export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setInfo(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsed.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const supabase = createClient();
      if (!supabase) {
        setFormError("دیتابیس وصل نیست. متغیرهای Supabase را تنظیم کنید.");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp(parsed.data);
        if (error) {
          setFormError(translateAuthError(error.message));
          return;
        }
        setInfo(
          "حساب ساخته شد. اگر تأیید ایمیل فعال باشد، اول ایمیلتان را تأیید کنید. بعد باید با یک دستور SQL نقش مدیر بگیرید.",
        );
        setMode("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        setFormError(translateAuthError(error.message));
        return;
      }

      // refresh() first so the server layout re-reads the new session cookies;
      // navigating without it can render the signed-out shell.
      router.refresh();
      router.push(nextPath && nextPath.startsWith("/admin") ? nextPath : "/admin");
    });
  };

  return (
    <div className="mx-auto max-w-sm py-10">
      <Bracket>ورود مدیر</Bracket>
      <h1 className="type-display mt-3 text-3xl">
        {mode === "signin" ? "ورود به پنل" : "ساخت حساب"}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <Field id="email" label="ایمیل" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            className={`${inputClass} text-start`}
            aria-invalid={Boolean(errors.email)}
          />
        </Field>

        <Field id="password" label="رمز عبور" error={errors.password}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            dir="ltr"
            className={`${inputClass} text-start`}
            aria-invalid={Boolean(errors.password)}
          />
        </Field>

        {formError && (
          <p role="alert" className="type-utility !text-accent">
            {formError}
          </p>
        )}
        {info && (
          <p role="status" className="type-utility leading-relaxed">
            {info}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "…" : mode === "signin" ? "ورود" : "ثبت‌نام"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "signin" ? "signup" : "signin"));
          setFormError(null);
          setInfo(null);
        }}
        className="type-utility mt-8 transition-colors hover:!text-accent"
      >
        {mode === "signin" ? "اولین بار است؟ حساب بسازید" : "حساب دارید؟ وارد شوید"}
      </button>
    </div>
  );
}

/** Supabase returns English auth errors; these are the ones users actually hit. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "ایمیل یا رمز عبور درست نیست.";
  if (m.includes("email not confirmed")) return "اول ایمیلتان را تأیید کنید.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "این ایمیل قبلاً ثبت شده است. وارد شوید.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "تلاش‌های زیاد. کمی صبر کنید و دوباره امتحان کنید.";
  if (m.includes("password")) return "رمز عبور قابل قبول نیست (حداقل ۶ کاراکتر).";
  return message;
}
