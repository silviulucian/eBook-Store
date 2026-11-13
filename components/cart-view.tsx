"use client";

import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { removeFromCart, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";

export function CartView() {
  const items = useCart();
  if (items.length === 0) {
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
  const currency = items[0].currency;
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <div className="w-16 shrink-0">
              <BookCover title={item.title} author={item.author} color={item.coverColor} />
            </div>
            <div className="flex-1">
              <Link href={`/books/${item.slug}`} className="font-medium hover:underline">
                {item.title}
              </Link>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.author}</p>
            </div>
            <span className="font-semibold">{formatPrice(item.priceCents, item.currency)}</span>
            <button
              type="button"
              onClick={() => removeFromCart(item.id)}
              aria-label={`Remove ${item.title} from cart`}
              className="text-sm underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <span className="text-lg">Total</span>
        <span className="text-2xl font-semibold">{formatPrice(total, currency)}</span>
      </div>
      <Link
        href="/checkout"
        className="inline-flex h-12 items-center justify-center self-end rounded-full bg-foreground px-8 font-medium text-background hover:opacity-90"
      >
        Checkout
      </Link>
    </div>
  );
}
