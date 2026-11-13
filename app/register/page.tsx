import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <Suspense fallback={null}>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/register">["searchParams"] }) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={typeof next === "string" ? next : undefined} />;
}
