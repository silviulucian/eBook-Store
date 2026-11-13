import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Your cart</h1>
      <CartView />
    </div>
  );
}
