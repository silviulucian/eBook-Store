import { handle, json } from "@/lib/api";
import { listCategories } from "@/lib/books";

export const GET = handle(async () => json({ items: await listCategories() }));
