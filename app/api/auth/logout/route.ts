import { assertSameOrigin, handle } from "@/lib/api";
import { destroySession } from "@/lib/session";

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  await destroySession();
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
});
