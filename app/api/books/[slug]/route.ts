import { handle, json } from "@/lib/api";
import { getBookBySlug } from "@/lib/books";
import { ApiError } from "@/lib/errors";

export const GET = handle(async (_request, ctx: RouteContext<"/api/books/[slug]">) => {
  const { slug } = await ctx.params;
  const book = await getBookBySlug(slug);
  if (!book) throw new ApiError(404, "not_found", "Book not found");
  return json({ book });
});
