"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState(params.get("error") ? "That sign-in link expired or was already used. Request a new one." : "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-10 border border-[#2c2a24]/20 p-6">
        <p className="font-display text-2xl italic">Check your inbox</p>
        <p className="mt-2 opacity-70">
          We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-4">
      <label className="text-sm" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border border-[#2c2a24]/30 bg-transparent px-4 py-3 outline-none focus:border-[#2c2a24]"
        placeholder="you@example.com"
      />
      <button
        disabled={state === "sending"}
        className="bg-[#2c2a24] px-6 py-3 text-xs uppercase tracking-[0.3em] text-[#faf5ea] transition hover:bg-[#8a6d2f] disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Send sign-in link"}
      </button>
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
