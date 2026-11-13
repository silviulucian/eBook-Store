import { z } from "zod";
import { enforceRateLimit, handle, json, parseBody, requireUser, validate } from "@/lib/api";
import { payOrder } from "@/lib/orders";
import { payOrderSchema } from "@/lib/validation";

export const POST = handle(async (request, ctx: RouteContext<"/api/orders/[id]/pay">) => {
  const user = await requireUser();
  enforceRateLimit(`pay:${user.id}`, 20, 15 * 60_000);
  const { id } = validate(z.object({ id: z.uuid() }), await ctx.params);
  const input = await parseBody(request, payOrderSchema);
  return json({ order: await payOrder(user.id, id, input.card) });
});
