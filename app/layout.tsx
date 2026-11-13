import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { CartLink } from "@/components/cart-link";
import { UserNav } from "@/components/user-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Paperleaf - Ebook Store", template: "%s | Paperleaf" },
  description: "A demo ebook store. Payments are mocked; no real purchases are made.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div role="note" className="bg-amber-100 px-4 py-1.5 text-center text-sm text-amber-900">
          Demo store: payments are mocked and nothing is ever charged.
        </div>
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav
            aria-label="Main"
            className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4"
          >
            <div className="flex items-center gap-6">
              <Link href="/" className="font-serif text-xl font-semibold">
                Paperleaf
              </Link>
              <Link href="/books" className="text-sm hover:underline">
                Catalogue
              </Link>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <CartLink />
              <Suspense fallback={<span className="text-zinc-500">...</span>}>
                <UserNav />
              </Suspense>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Paperleaf demo. Classic titles only; no real products or payments.
        </footer>
      </body>
    </html>
  );
}
