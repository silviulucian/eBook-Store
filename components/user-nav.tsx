import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "./logout-button";

/** Reads the session cookie, so it must render inside <Suspense>. */
export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <Link href="/login" className="hover:underline">Sign in</Link>
        <Link
          href="/register"
          className="rounded-full bg-foreground px-4 py-1.5 text-background hover:opacity-90"
        >
          Create account
        </Link>
      </>
    );
  }
  return (
    <>
      <Link href="/orders" className="hover:underline">My orders</Link>
      <span className="text-zinc-600 dark:text-zinc-400" aria-label="Signed in user">{user.name}</span>
      <LogoutButton />
    </>
  );
}
