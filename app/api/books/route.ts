import { handle, json, validate } from "@/lib/api";
import { listBooks } from "@/lib/books";
import { booksQuerySchema } from "@/lib/validation";

export const GET = handle(async (request) => {
  const params = validate(booksQuerySchema, Object.fromEntries(request.nextUrl.searchParams));
  return json(await listBooks(params));
});
