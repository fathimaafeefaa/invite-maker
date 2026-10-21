import { AppHeader } from "@/components/AppHeader";
import { createInvitation } from "@/app/actions/invitations";
import { listTemplates } from "@/lib/templates/registry";

export const metadata = { title: "Choose a template · invite-maker" };

export default function NewPage() {
  const templates = listTemplates();
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-[#8a6d2f]">Step 1</p>
        <h1 className="font-display mt-3 text-5xl italic">Pick a template</h1>
        <p className="mt-3 max-w-xl opacity-70">You can change every detail afterwards. Your invitation gets its own link the moment you publish.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <form key={t.id} action={createInvitation.bind(null, t.id)} className="flex flex-col border border-[#2c2a24]/20 p-6">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#8a6d2f]">{t.occasion.replace("-", " ")}</p>
              <h2 className="font-display mt-3 text-3xl italic">{t.name}</h2>
              <p className="mt-3 flex-1 text-sm opacity-70">{t.description}</p>
              <button className="mt-8 bg-[#2c2a24] px-6 py-3 text-xs uppercase tracking-[0.3em] text-[#faf5ea] transition hover:bg-[#8a6d2f]">
                Use this template
              </button>
            </form>
          ))}
        </div>
        <p className="mt-10 text-sm opacity-60">More occasions (birthdays, housewarmings, baby showers…) are on the way.</p>
      </main>
    </>
  );
}
