import Link from "next/link";
import { formatPrice } from "@/lib/money";
import type { Book } from "@/lib/types";
import { BookCover } from "./book-cover";

export function BookCard({ book }: { book: Book }) {
  return (
    <li className="flex flex-col gap-3">
      <Link href={`/books/${book.slug}`} className="block transition-transform hover:-translate-y-1">
        <BookCover title={book.title} author={book.author} color={book.coverColor} />
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/books/${book.slug}`} className="font-medium hover:underline">
            {book.title}
          </Link>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{book.author}</p>
        </div>
        <span className="font-semibold">{formatPrice(book.priceCents, book.currency)}</span>
      </div>
    </li>
  );
}
