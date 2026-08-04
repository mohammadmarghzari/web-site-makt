"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const signOut = () => {
    startTransition(async () => {
      await createClient()?.auth.signOut();
      // refresh() re-runs the server layout so the gate re-evaluates with the
      // cleared cookies; push() alone would render the cached signed-in shell.
      router.refresh();
      router.push("/admin/login");
    });
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="type-utility transition-colors hover:!text-accent disabled:opacity-50"
    >
      {pending ? "…" : "خروج"}
    </button>
  );
}
