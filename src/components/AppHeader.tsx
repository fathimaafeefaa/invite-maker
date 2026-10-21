import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export function AppHeader({ email }: { email?: string }) {
  return (
    <header className="border-b border-[#2c2a24]/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="font-display text-xl italic">
          invite-maker
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {email && <span className="hidden opacity-60 sm:inline">{email}</span>}
          <form action={signOut}>
            <button className="text-xs uppercase tracking-[0.25em] opacity-70 transition hover:opacity-100">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
