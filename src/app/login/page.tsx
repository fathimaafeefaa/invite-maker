import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · invite-maker" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-[0.4em] text-[#8a6d2f]">invite-maker</p>
      <h1 className="font-display mt-4 text-5xl italic">Welcome back</h1>
      <p className="mt-4 opacity-70">Enter your email and we&apos;ll send you a sign-in link. No password needed.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
