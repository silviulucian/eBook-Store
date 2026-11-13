"use client";

import Link from "next/link";
import { addToCart, useCart } from "@/lib/cart";
import type { Book } from "@/lib/types";

export function AddToCartButton({ book }: { book: Book }) {
  const inCart = useCart().some((i) => i.id === book.id);
  if (inCart) {
    return (
      <Link
        href="/cart"
        className="inline-flex h-11 items-center rounded-full border border-zinc-300 px-6 font-medium dark:border-zinc-700"
      >
        In cart - view cart
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() =>
        addToCart({
          id: book.id,
          slug: book.slug,
          title: book.title,
          author: book.author,
          priceCents: book.priceCents,
          currency: book.currency,
          coverColor: book.coverColor,
        })
      }
      className="inline-flex h-11 items-center rounded-full bg-foreground px-6 font-medium text-background hover:opacity-90"
    >
      Add to cart
    </button>
  );
}
