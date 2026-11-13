import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { formatPrice } from "@/lib/money";
import { listOrders } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "My orders" };

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">My orders</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading orders...</p>}>
        <Orders />
      </Suspense>
    </div>
  );
}

async function Orders() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");
  const orders = (await listOrders(user.id)).filter((o) => o.status === "paid");

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="status">You have not bought any books yet.</p>
        <Link href="/books" className="underline">
          Browse the catalogue
        </Link>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {orders.map((order) => (
        <li key={order.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={`/orders/${order.id}`} className="font-mono font-medium hover:underline">
              {order.confirmationCode}
            </Link>
            <span className="font-semibold">{formatPrice(order.totalCents, order.currency)}</span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {order.paidAt && new Date(order.paidAt).toISOString().slice(0, 10)} -{" "}
            {order.items.map((i) => i.title).join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
