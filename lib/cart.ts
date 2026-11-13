"use client";

import { useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  priceCents: number;
  currency: string;
  coverColor: string;
};

const KEY = "paperleaf-cart";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();

let lastRaw: string | null = null;
let lastItems: CartItem[] = EMPTY;

function isItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.slug === "string" &&
    typeof v.title === "string" &&
    typeof v.author === "string" &&
    Number.isInteger(v.priceCents) &&
    typeof v.currency === "string" &&
    typeof v.coverColor === "string"
  );
}

// Must return a referentially stable value while the stored string is unchanged.
function getSnapshot(): CartItem[] {
  const raw = window.localStorage.getItem(KEY);
  if (raw === lastRaw) return lastItems;
  lastRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    lastItems = Array.isArray(parsed) ? parsed.filter(isItem) : EMPTY;
  } catch {
    lastItems = EMPTY;
  }
  return lastItems;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(items: CartItem[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function addToCart(item: CartItem): void {
  const items = getSnapshot();
  if (items.some((i) => i.id === item.id)) return; // ebooks: one copy each
  write([...items, item]);
}

export function removeFromCart(id: string): void {
  write(getSnapshot().filter((i) => i.id !== id));
}

export function clearCart(): void {
  write([]);
}
