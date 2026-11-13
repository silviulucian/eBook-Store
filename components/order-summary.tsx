import Link from "next/link";
import { formatPrice } from "@/lib/money";
import type { Order } from "@/lib/types";

export function OrderSummary({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {order.items.map((item) => (
          <li key={item.bookId} className="flex justify-between gap-4 py-3">
            <div>
              <Link href={`/books/${item.slug}`} className="font-medium hover:underline">
                {item.title}
              </Link>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.author}</p>
            </div>
            <span>{formatPrice(item.unitPriceCents, order.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between border-t border-zinc-200 pt-3 text-lg font-semibold dark:border-zinc-800">
        <span>Total</span>
        <span>{formatPrice(order.totalCents, order.currency)}</span>
      </p>
    </div>
  );
}
