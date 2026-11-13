import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

// Access is gated by proxy.ts (optimistic) and by the 401 handling in the order/pay APIs (authoritative).
export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
