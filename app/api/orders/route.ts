import { handle, json, parseBody, requireUser } from "@/lib/api";
import { createOrder, listOrders } from "@/lib/orders";
import { createOrderSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const user = await requireUser();
  return json({ items: await listOrders(user.id) });
});

export const POST = handle(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, createOrderSchema);
  return json({ order: await createOrder(user.id, input.bookIds) }, { status: 201 });
});
