import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { OrderSummary } from "@/components/order-summary";
import { getOrder } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Order confirmation" };

export default function OrderPage(props: PageProps<"/orders/[id]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading order...</p>}>
      <Order params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Order({
  params,
  searchParams,
}: {
  params: PageProps<"/orders/[id]">["params"];
  searchParams: PageProps<"/orders/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { confirmed } = await searchParams;
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${parsedId.data}`);
  const order = await getOrder(user.id, parsedId.data);
  if (!order) notFound();

  if (order.status !== "paid") {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-semibold">Payment not completed</h1>
        <p>This order has not been paid yet.</p>
        <Link href="/checkout" className="underline">
          Return to checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">
          {confirmed ? "Thank you for your purchase!" : "Order details"}
        </h1>
        <p role="status" className="mt-2 text-zinc-600 dark:text-zinc-400">
          Confirmation code{" "}
          <strong data-testid="confirmation-code" className="font-mono text-foreground">
            {order.confirmationCode}
          </strong>
          {order.payment && (
            <>
              {" "}
              - paid with {order.payment.cardBrand} ending {order.payment.cardLast4}
            </>
          )}
          . This is a demo, so no money was charged.
        </p>
      </div>
      <OrderSummary order={order} />
      <div className="flex gap-4">
        <Link href="/orders" className="underline">
          All orders
        </Link>
        <Link href="/books" className="underline">
          Keep browsing
        </Link>
      </div>
    </div>
  );
}
