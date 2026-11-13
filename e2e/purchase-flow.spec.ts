import { expect, test } from "@playwright/test";

const email = `e2e-${Date.now()}@example.com`;
const password = "a very long test password";

test("browse, register, buy with a declined then successful card, see confirmation", async ({ page }) => {
  // Catalogue + search
  await page.goto("/books");
  await expect(page.getByRole("heading", { name: "Catalogue" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search title or author" }).fill("holmes");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=holmes/);
  await expect(page.getByRole("link", { name: "The Adventures of Sherlock Holmes" }).first()).toBeVisible();

  // Book detail -> cart
  await page.getByRole("link", { name: "The Adventures of Sherlock Holmes" }).first().click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("link", { name: "In cart - view cart" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();

  // Checkout while signed out is redirected to login, preserving the destination
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);

  // Register, then land back on checkout
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  // Role locators only match visible elements; the previous route stays mounted but hidden.
  await page.getByRole("textbox", { name: "Name" }).fill("E2E Reader");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").and(page.locator("input:visible")).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("navigation", { name: "Main" }).getByLabel("Signed in user")).toHaveText("E2E Reader");

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

  // Declined card keeps the user on the page with a clear error
  await page.getByLabel("Card number").fill("4000 0000 0000 0002");
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect(page.getByRole("alert").filter({ hasText: "declined" })).toHaveText("Your card was declined.");

  // Retry with a good card
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: /^Pay / }).click();

  // Confirmation
  await expect(page.getByRole("heading", { name: "Thank you for your purchase!" })).toBeVisible();
  await expect(page.getByTestId("confirmation-code")).toHaveText(/^PL-[A-Z2-9]{8}$/);
  await expect(page.getByText("paid with Visa ending 4242")).toBeVisible();

  // Cart emptied; order appears in history
  await expect(page.getByRole("link", { name: /^Cart/ })).toHaveText("Cart");
  await page.getByRole("link", { name: "All orders" }).click();
  await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
  await expect(page.getByText(/- The Adventures of Sherlock Holmes$/)).toBeVisible();

  // Sign out protects /orders
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);
});

test("unknown book renders the not-found page and is not indexable", async ({ page }) => {
  // Streamed pages keep HTTP 200 once streaming starts; Next.js injects noindex instead.
  await page.goto("/books/does-not-exist");
  await expect(page.getByText("This page could not be found")).toBeVisible();
  await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
});
