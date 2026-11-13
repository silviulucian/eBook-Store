"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const count = useCart().length;
  return (
    <Link href="/cart" className="hover:underline">
      Cart{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
