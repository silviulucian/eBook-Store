"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { clearCart, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";

type ApiFailure = { error?: { code?: string; message?: string; details?: { path: string; message: string }[] } };

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as (ApiFailure & Record<string, unknown>) | null;
  return { ok: response.ok, status: response.status, payload };
}

function describe(payload: ApiFailure | null): string {
  const detail = payload?.error?.details?.[0];
  if (detail) return `${detail.path}: ${detail.message}`;
  return payload?.error?.message ?? "Something went wrong";
}

export function CheckoutForm() {
  const router = useRouter();
  const items = useCart();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (items.length === 0 && !pending) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="status">Your cart is empty.</p>
        <Link href="/books" className="underline">
          Browse the catalogue
        </Link>
      </div>
    );
  }

  const total = items.reduce((sum, i) => sum + i.priceCents, 0);
  const currency = items[0]?.currency ?? "USD";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      let id = orderId;
      if (!id) {
        const created = await post("/api/orders", { bookIds: items.map((i) => i.id) });
        if (created.status === 401) {
          router.push("/login?next=/checkout");
          return;
        }
        if (!created.ok) {
          setError(describe(created.payload));
          return;
        }
        id = (created.payload as { order: { id: string } }).order.id;
        setOrderId(id); // retries after a decline reuse the same pending order
      }
      const paid = await post(`/api/orders/${id}/pay`, {
        card: {
          number: data.get("number"),
          expMonth: data.get("expMonth"),
          expYear: data.get("expYear"),
          cvc: data.get("cvc"),
        },
      });
      if (paid.ok) {
        clearCart();
        router.push(`/orders/${id}?confirmed=1`);
        return;
      }
      setError(describe(paid.payload));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const input =
    "h-11 w-full rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700";
  const label = "flex flex-col gap-1 text-sm font-medium";

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section aria-labelledby="summary">
        <h2 id="summary" className="mb-3 text-xl font-semibold">
          Order summary
        </h2>
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>{i.title}</span>
              <span>{formatPrice(i.priceCents, i.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-zinc-200 pt-4 text-lg font-semibold dark:border-zinc-800">
          <span>Total</span>
          <span>{formatPrice(total, currency)}</span>
        </p>
      </section>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <h2 className="text-xl font-semibold">Payment (mock)</h2>
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Demo only. Use <code>4242 4242 4242 4242</code> to succeed or{" "}
          <code>4000 0000 0000 0002</code> to see a decline. Any future expiry and 3-digit CVC.
        </p>
        <label className={label}>
          Card number
          <input
            name="number"
            inputMode="numeric"
            autoComplete="cc-number"
            required
            defaultValue="4242 4242 4242 4242"
            className={input}
          />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className={label}>
            Month
            <input name="expMonth" inputMode="numeric" autoComplete="cc-exp-month" required defaultValue="12" className={input} />
          </label>
          <label className={label}>
            Year
            <input name="expYear" inputMode="numeric" autoComplete="cc-exp-year" required defaultValue={String(new Date().getFullYear() + 3)} className={input} />
          </label>
          <label className={label}>
            CVC
            <input name="cvc" inputMode="numeric" autoComplete="cc-csc" required defaultValue="123" className={input} />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-full bg-foreground font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Processing..." : `Pay ${formatPrice(total, currency)}`}
        </button>
      </form>
    </div>
  );
}
