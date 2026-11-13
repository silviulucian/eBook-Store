// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { AddToCartButton } from "@/components/add-to-cart-button";
import { AuthForm } from "@/components/auth-form";
import { BookCard } from "@/components/book-card";
import { CartView } from "@/components/cart-view";
import { addToCart, clearCart, useCart } from "@/lib/cart";
import type { Book } from "@/lib/types";

const book: Book = {
  id: "b1",
  slug: "walden",
  title: "Walden",
  author: "Henry David Thoreau",
  description: "d",
  category: { slug: "non-fiction", name: "Non-Fiction" },
  priceCents: 549,
  currency: "USD",
  pages: 352,
  publishedYear: 1854,
  isbn: null,
  coverColor: "#3b7a4a",
};

beforeEach(() => {
  window.localStorage.clear();
  clearCart();
  push.mockReset();
  vi.restoreAllMocks();
});

describe("BookCard", () => {
  it("shows title, author, formatted price and links to the detail page", () => {
    render(<ul><BookCard book={book} /></ul>);
    expect(screen.getByText("$5.49")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Walden/ })[0]).toHaveAttribute("href", "/books/walden");
  });
});

describe("cart", () => {
  it("adds a book once and then offers a link to the cart", async () => {
    const user = userEvent.setup();
    render(<AddToCartButton book={book} />);
    await user.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(await screen.findByRole("link", { name: /In cart/ })).toHaveAttribute("href", "/cart");
    expect(JSON.parse(window.localStorage.getItem("paperleaf-cart")!)).toHaveLength(1);
  });

  it("ignores duplicates and tolerates corrupt storage", () => {
    const item = { id: "b1", slug: "w", title: "W", author: "A", priceCents: 100, currency: "USD", coverColor: "#000000" };
    addToCart(item);
    addToCart(item);
    expect(JSON.parse(window.localStorage.getItem("paperleaf-cart")!)).toHaveLength(1);

    window.localStorage.setItem("paperleaf-cart", "{not json");
    function Probe() {
      return <p>{useCart().length} items</p>;
    }
    render(<Probe />);
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it("drops malformed entries (e.g. tampered price)", () => {
    window.localStorage.setItem("paperleaf-cart", JSON.stringify([{ id: "x", priceCents: "free" }]));
    render(<CartView />);
    expect(screen.getByRole("status")).toHaveTextContent("Your cart is empty.");
  });

  it("totals the cart and removes items", async () => {
    const user = userEvent.setup();
    const base = { slug: "s", author: "A", currency: "USD", coverColor: "#000000" };
    addToCart({ ...base, id: "1", title: "One", priceCents: 500 });
    addToCart({ ...base, id: "2", title: "Two", priceCents: 250 });
    render(<CartView />);
    expect(screen.getByText("$7.50")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove One from cart" }));
    expect(screen.queryByText("One")).not.toBeInTheDocument();
    expect(screen.getAllByText("$2.50").length).toBeGreaterThan(0);
  });
});

describe("AuthForm", () => {
  it("registers and navigates to a safe next path", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 201 }));
    render(<AuthForm mode="register" next="/checkout" />);
    await user.type(screen.getByLabelText("Name"), "Ann");
    await user.type(screen.getByLabelText("Email"), "ann@example.com");
    await user.type(screen.getByLabelText(/Password/), "a long enough password");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({ method: "POST" }));
    expect(push).toHaveBeenCalledWith("/checkout");
  });

  it("refuses to follow an off-site next parameter", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    render(<AuthForm mode="login" next="https://evil.example" />);
    await user.type(screen.getByLabelText("Email"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "whatever");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows the server error without navigating", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "invalid_credentials", message: "Invalid email or password" } }), {
        status: 401,
      }),
    );
    render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText("Email"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(push).not.toHaveBeenCalled();
  });
});
