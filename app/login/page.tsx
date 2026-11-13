import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <Suspense fallback={null}>
        <Form searchParams={props.searchParams} mode="login" />
      </Suspense>
    </div>
  );
}

async function Form({
  searchParams,
  mode,
}: {
  searchParams: PageProps<"/login">["searchParams"];
  mode: "login";
}) {
  const { next } = await searchParams;
  return <AuthForm mode={mode} next={typeof next === "string" ? next : undefined} />;
}
