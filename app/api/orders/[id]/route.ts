import { z } from "zod";
import { handle, json, requireUser, validate } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { getOrder } from "@/lib/orders";

export const GET = handle(async (_request, ctx: RouteContext<"/api/orders/[id]">) => {
  const user = await requireUser();
  const { id } = validate(z.object({ id: z.uuid() }), await ctx.params);
  const order = await getOrder(user.id, id);
  if (!order) throw new ApiError(404, "not_found", "Order not found");
  return json({ order });
});
