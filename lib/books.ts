import "server-only";
import { query } from "./db";
import type { Book, BookPage, Category } from "./types";
import type { BooksQuery } from "./validation";

type BookRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  category_slug: string;
  category_name: string;
  price_cents: number;
  currency: string;
  pages: number | null;
  published_year: number | null;
  isbn: string | null;
  cover_color: string;
};

const BOOK_SELECT = `
  SELECT b.id, b.slug, b.title, b.author, b.description,
         c.slug AS category_slug, c.name AS category_name,
         b.price_cents, b.currency, b.pages, b.published_year, b.isbn, b.cover_color
    FROM books b JOIN categories c ON c.id = b.category_id`;

const toBook = (r: BookRow): Book => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  author: r.author,
  description: r.description,
  category: { slug: r.category_slug, name: r.category_name },
  priceCents: r.price_cents,
  currency: r.currency,
  pages: r.pages,
  publishedYear: r.published_year,
  isbn: r.isbn,
  coverColor: r.cover_color,
});

/** Escapes LIKE wildcards so user input is matched literally. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export async function listBooks(params: BooksQuery): Promise<BookPage> {
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.q) {
    values.push(`%${escapeLike(params.q)}%`);
    where.push(`(b.title ILIKE $${values.length} OR b.author ILIKE $${values.length})`);
  }
  if (params.category) {
    values.push(params.category);
    where.push(`c.slug = $${values.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [count] = await query<{ total: string }>(
    `SELECT count(*) AS total FROM books b JOIN categories c ON c.id = b.category_id ${whereSql}`,
    values,
  );
  const rows = await query<BookRow>(
    `${BOOK_SELECT} ${whereSql} ORDER BY b.title ASC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize],
  );
  return {
    items: rows.map(toBook),
    page: params.page,
    pageSize: params.pageSize,
    total: Number(count?.total ?? 0),
  };
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const rows = await query<BookRow>(`${BOOK_SELECT} WHERE b.slug = $1`, [slug]);
  return rows[0] ? toBook(rows[0]) : null;
}

export async function listBooksByIds(ids: string[]): Promise<Book[]> {
  const rows = await query<BookRow>(`${BOOK_SELECT} WHERE b.id = ANY($1::uuid[])`, [ids]);
  return rows.map(toBook);
}

export async function listCategories(): Promise<Category[]> {
  return query<Category>("SELECT id, slug, name FROM categories ORDER BY name ASC");
}
