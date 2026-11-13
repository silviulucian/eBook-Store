import Link from "next/link";
import { Suspense } from "react";
import { BookCard } from "@/components/book-card";
import { listBooks } from "@/lib/books";

export default function Home() {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-start gap-4 py-8">
        <h1 className="max-w-2xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          Read the classics, instantly.
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Browse a hand-picked catalogue of timeless ebooks. Create an account, add titles to your
          cart and check out in seconds.
        </p>
        <Link
          href="/books"
          className="inline-flex h-12 items-center rounded-full bg-foreground px-6 font-medium text-background hover:opacity-90"
        >
          Browse the catalogue
        </Link>
      </section>
      <section aria-labelledby="featured">
        <h2 id="featured" className="mb-4 text-2xl font-semibold">
          Featured
        </h2>
        <Suspense fallback={<p className="text-zinc-500">Loading books...</p>}>
          <Featured />
        </Suspense>
      </section>
    </div>
  );
}

async function Featured() {
  const { items } = await listBooks({ page: 1, pageSize: 4 });
  return (
    <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {items.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </ul>
  );
}
