"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="hover:underline disabled:opacity-50"
      onClick={async () => {
        setPending(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          router.push("/");
          router.refresh();
          setPending(false);
        }
      }}
    >
      Sign out
    </button>
  );
}
