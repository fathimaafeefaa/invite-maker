import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#faf5ea] text-[#2c2a24]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl italic">invite-maker</span>
        <Link href="/login" className="text-xs uppercase tracking-[0.25em] opacity-70 transition hover:opacity-100">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col items-start px-6 pb-32 pt-24 sm:pt-36">
        <p className="reveal text-xs uppercase tracking-[0.5em] text-[#8a6d2f]">Free · No payment · No hidden fees</p>
        <h1 className="reveal font-display mt-8 max-w-4xl text-6xl leading-[1.02] italic sm:text-8xl" style={{ animationDelay: ".12s" }}>
          One link.
          <br />
          Every guest.
          <br />
          Beautifully invited.
        </h1>
        <p className="reveal mt-10 max-w-xl text-lg opacity-75" style={{ animationDelay: ".25s" }}>
          Pick a template, add your names, date and photos, and share a single link on WhatsApp. Guests RSVP right on the page, and you watch the replies arrive.
        </p>
        <div className="reveal mt-12 flex flex-wrap gap-4" style={{ animationDelay: ".38s" }}>
          <Link href="/new" className="bg-[#2c2a24] px-8 py-4 text-xs uppercase tracking-[0.3em] text-[#faf5ea] transition hover:bg-[#8a6d2f]">
            Create your invitation
          </Link>
          <Link href="/login" className="border border-[#2c2a24] px-8 py-4 text-xs uppercase tracking-[0.3em] transition hover:bg-[#2c2a24] hover:text-[#faf5ea]">
            I have an account
          </Link>
        </div>
      </section>
    </main>
  );
}
