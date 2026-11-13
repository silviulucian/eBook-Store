export type Category = { id: string; slug: string; name: string };

export type Book = {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  category: { slug: string; name: string };
  priceCents: number;
  currency: string;
  pages: number | null;
  publishedYear: number | null;
  isbn: string | null;
  coverColor: string;
};

export type BookPage = {
  items: Book[];
  page: number;
  pageSize: number;
  total: number;
};

export type User = { id: string; email: string; name: string };

export type OrderItem = {
  bookId: string;
  slug: string;
  title: string;
  author: string;
  unitPriceCents: number;
};

export type OrderStatus = "pending" | "paid";

export type Order = {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  confirmationCode: string | null;
  createdAt: string;
  paidAt: string | null;
  items: OrderItem[];
  payment: { cardBrand: string; cardLast4: string; transactionRef: string } | null;
};

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};
