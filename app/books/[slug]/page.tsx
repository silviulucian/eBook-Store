import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { BookCover } from "@/components/book-cover";
import { getBookBySlug } from "@/lib/books";
import { formatPrice } from "@/lib/money";

export async function generateMetadata(props: PageProps<"/books/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const book = await getBookBySlug(slug);
  return book ? { title: book.title, description: book.description } : { title: "Book not found" };
}

export default function BookPage(props: PageProps<"/books/[slug]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading book...</p>}>
      <BookDetail params={props.params} />
    </Suspense>
  );
}

async function BookDetail({ params }: { params: PageProps<"/books/[slug]">["params"] }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const facts: [string, string | number | null][] = [
    ["Category", book.category.name],
    ["Pages", book.pages],
    ["Published", book.publishedYear],
    ["ISBN", book.isbn],
  ];

  return (
    <article className="flex flex-col gap-8 md:flex-row">
      <BookCover title={book.title} author={book.author} color={book.coverColor} size="lg" />
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="font-serif text-4xl font-semibold">{book.title}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">by {book.author}</p>
        <p className="text-2xl font-semibold">{formatPrice(book.priceCents, book.currency)}</p>
        <p className="leading-7">{book.description}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          {facts
            .filter(([, value]) => value !== null)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-zinc-500">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        <div>
          <AddToCartButton book={book} />
        </div>
      </div>
    </article>
  );
}
