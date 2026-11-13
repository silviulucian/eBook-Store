import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookCard } from "@/components/book-card";
import { listBooks, listCategories } from "@/lib/books";
import { booksQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Catalogue" };

export default function CataloguePage(props: PageProps<"/books">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Catalogue</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading catalogue...</p>}>
        <Catalogue searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function href(params: { q?: string; category?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const s = qs.toString();
  return s ? `/books?${s}` : "/books";
}

async function Catalogue({
  searchParams,
}: {
  searchParams: PageProps<"/books">["searchParams"];
}) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  // Invalid URL parameters fall back to defaults instead of erroring the page.
  const parsed = booksQuerySchema.safeParse(flat);
  const params = parsed.success ? parsed.data : booksQuerySchema.parse({});

  const [result, categories] = await Promise.all([listBooks(params), listCategories()]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      <form action="/books" method="get" role="search" className="flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search title or author"
          aria-label="Search title or author"
          maxLength={100}
          className="h-11 min-w-64 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
        />
        <select
          name="category"
          defaultValue={params.category ?? ""}
          aria-label="Category"
          className="h-11 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 rounded-full bg-foreground px-6 font-medium text-background hover:opacity-90"
        >
          Search
        </button>
      </form>

      {result.items.length === 0 ? (
        <p role="status" className="py-8 text-zinc-600 dark:text-zinc-400">
          No books match your search.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {result.total} {result.total === 1 ? "book" : "books"}
          </p>
          <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </ul>
        </>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-4">
          {params.page > 1 && (
            <Link href={href({ ...params, page: params.page - 1 })} className="underline">
              Previous
            </Link>
          )}
          <span className="text-sm">
            Page {params.page} of {totalPages}
          </span>
          {params.page < totalPages && (
            <Link href={href({ ...params, page: params.page + 1 })} className="underline">
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
