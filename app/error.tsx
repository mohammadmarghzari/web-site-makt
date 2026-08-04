"use client";

import { useEffect } from "react";

/*
 * Runtime error boundary.
 *
 * Cannot use the shared UI components: if the failure came from a shared
 * module, importing it here would throw again and leave a truly blank page.
 * Styles are inline for the same reason.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        padding: "2rem 1rem",
        backgroundColor: "#4E5F6E",
        color: "#F2F5F7",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ margin: "0 auto", maxWidth: "32rem" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "#C4D0D9" }}>[ خطا ]</p>
        <h1 style={{ marginTop: "1rem", fontSize: "2.25rem", fontWeight: 900, lineHeight: 1 }}>
          چیزی درست پیش نرفت
        </h1>
        <p style={{ marginTop: "1.5rem", fontSize: 14, lineHeight: 1.8, color: "#C4D0D9" }}>
          مشکلی در بارگذاری این صفحه پیش آمد. یک بار دیگر تلاش کنید؛ اگر باز هم تکرار
          شد، کمی بعد سر بزنید.
        </p>
        {error.digest && (
          <p dir="ltr" style={{ marginTop: "1rem", fontSize: 11, color: "#C4D0D9" }}>
            {error.digest}
          </p>
        )}
        <div style={{ marginTop: "2rem", display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "1px solid #E4EDF2",
              backgroundColor: "#E4EDF2",
              color: "#41525f",
              padding: "0.625rem 1.25rem",
              borderRadius: 4,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            تلاش دوباره
          </button>
          <a href="/" style={{ fontSize: 13, color: "#C4D0D9" }}>
            بازگشت به خانه
          </a>
        </div>
      </div>
    </main>
  );
}
