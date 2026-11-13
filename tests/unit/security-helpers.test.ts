import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { formatPrice } from "@/lib/money";

describe("password hashing", () => {
  it("round-trips and uses a random salt", async () => {
    const [a, b] = await Promise.all([hashPassword("correct horse battery"), hashPassword("correct horse battery")]);
    expect(a).not.toEqual(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
  });

  it("rejects wrong passwords and malformed hashes", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("anything", "plaintext")).toBe(false);
    expect(await verifyPassword("anything", "bcrypt$1$2$3$4$5")).toBe(false);
  });

  it("never stores the password in the hash", async () => {
    expect(await hashPassword("correct horse battery")).not.toContain("correct horse battery");
  });
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks, and resets after the window", () => {
    resetRateLimits();
    const t0 = 1_000_000;
    expect(rateLimit("k", 2, 1000, t0).allowed).toBe(true);
    expect(rateLimit("k", 2, 1000, t0 + 1).allowed).toBe(true);
    const blocked = rateLimit("k", 2, 1000, t0 + 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(rateLimit("k", 2, 1000, t0 + 1001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    resetRateLimits();
    expect(rateLimit("a", 1, 1000, 0).allowed).toBe(true);
    expect(rateLimit("b", 1, 1000, 0).allowed).toBe(true);
    expect(rateLimit("a", 1, 1000, 1).allowed).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/orders", "/orders"],
    ["/books?q=a&page=2", "/books?q=a&page=2"],
    [null, "/"],
    [undefined, "/"],
    ["", "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["javascript:alert(1)", "/"],
    ["/ok\r\nSet-Cookie: x=y", "/"],
    ["/\t/evil.example", "/"],
  ])("%j -> %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it("honours a custom fallback", () => {
    expect(safeRedirectPath("//x", "/home")).toBe("/home");
  });
});

describe("formatPrice", () => {
  it("formats cents without floating point drift", () => {
    expect(formatPrice(699)).toBe("$6.99");
    expect(formatPrice(1398)).toBe("$13.98");
    expect(formatPrice(0)).toBe("$0.00");
  });
});
