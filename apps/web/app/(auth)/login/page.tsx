import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 text-lg font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              P
            </span>
            Poyesis
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your work email.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(1_0_0/0.18),transparent_55%),radial-gradient(circle_at_80%_80%,oklch(0.3_0.2_300/0.5),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Plan projects, book people and ship — with an assistant that knows your whole portfolio.
          </p>
        </div>
      </aside>
    </main>
  );
}
