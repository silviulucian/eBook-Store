import { json, handle } from "@/lib/api";
import { query } from "@/lib/db";

export const GET = handle(async () => {
  await query("SELECT 1");
  return json({ status: "ok" });
});
