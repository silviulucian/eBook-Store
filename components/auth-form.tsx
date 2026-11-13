"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { safeRedirectPath } from "@/lib/safe-redirect";

type Props = { mode: "login" | "register"; next?: string };

export function AuthForm({ mode, next }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(event.currentTarget);
    const body = isRegister
      ? { email: data.get("email"), name: data.get("name"), password: data.get("password") }
      : { email: data.get("email"), password: data.get("password") };
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail = payload?.error?.details?.[0]?.message;
        setError(
          detail && response.status === 422
            ? `${payload.error.details[0].path}: ${detail}`
            : (payload?.error?.message ?? "Something went wrong"),
        );
        return;
      }
      router.push(safeRedirectPath(next));
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const input =
    "h-11 w-full rounded-md border border-zinc-300 bg-transparent px-3 shadow-sm dark:border-zinc-700";

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-5" noValidate>
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 shadow-sm dark:border-zinc-800">
        {isRegister && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <input name="name" required maxLength={80} autoComplete="name" className={input} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isRegister ? 12 : undefined}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className={input}
          />
          {isRegister && <span className="font-normal text-zinc-500">At least 12 characters.</span>}
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-md border border-zinc-900 bg-foreground font-medium text-background shadow-sm hover:opacity-90 disabled:opacity-50 dark:border-zinc-100"
        >
          {pending ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          className="h-11 w-full rounded-md border border-zinc-300 bg-transparent font-medium text-foreground shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          SSO
        </button>
      </div>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {isRegister ? "Already have an account? " : "New here? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-foreground underline"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
