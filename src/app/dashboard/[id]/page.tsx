import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { invitationTitle, type InvitationRow } from "@/lib/invitations";
import { getTemplate } from "@/lib/templates/registry";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Replies · invite-maker" };

export default function ResponsesPage({ params }: PageProps<"/dashboard/[id]">) {
  return (
    <Suspense fallback={<div className="p-10 opacity-60">Loading…</div>}>
      <Responses params={params} />
    </Suspense>
  );
}

async function Responses({ params }: Pick<PageProps<"/dashboard/[id]">, "params">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: inv } = await supabase.from("invitations").select("*").eq("id", id).maybeSingle<InvitationRow>();
  if (!inv) notFound();

  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("id, name, attending, guest_count, phone, email, message, created_at")
    .eq("invitation_id", id)
    .order("created_at", { ascending: false });

  const list = rsvps ?? [];
  const yes = list.filter((r) => r.attending);
  const guests = yes.reduce((n, r) => n + r.guest_count, 0);
  const title = invitationTitle(getTemplate(inv.template_id), inv.data);

  return (
    <>
      <AppHeader email={auth.user.email} />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <Link href="/dashboard" className="text-xs uppercase tracking-[0.25em] opacity-70 hover:opacity-100">
          ← All invitations
        </Link>
        <h1 className="font-display mt-6 text-5xl italic">{title}</h1>
        <p className="mt-2 opacity-60">Replies</p>

        <dl className="mt-10 grid grid-cols-3 gap-4 text-center">
          {[
            ["Attending", yes.length],
            ["Total guests", guests],
            ["Declined", list.length - yes.length],
          ].map(([label, value]) => (
            <div key={label} className="border border-[#2c2a24]/20 p-6">
              <dd className="font-display text-5xl tabular-nums">{value}</dd>
              <dt className="mt-2 text-xs uppercase tracking-[0.25em] opacity-60">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex items-center justify-between">
          <h2 className="font-display text-2xl italic">Guest list</h2>
          {list.length > 0 && (
            <a href={`/dashboard/${id}/export`} className="border border-[#2c2a24] px-5 py-2.5 text-xs uppercase tracking-[0.25em] transition hover:bg-[#2c2a24] hover:text-[#faf5ea]">
              Download CSV
            </a>
          )}
        </div>

        {list.length === 0 ? (
          <p className="mt-8 border border-dashed border-[#2c2a24]/30 p-10 text-center opacity-70">
            No replies yet. Share your link and they&apos;ll appear here.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-[#2c2a24]/15 border-y border-[#2c2a24]/15">
            {list.map((r) => (
              <li key={r.id} className="py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-medium">{r.name}</p>
                  <p className={`text-sm ${r.attending ? "text-green-800" : "opacity-60"}`}>
                    {r.attending ? `Attending · ${r.guest_count} guest${r.guest_count === 1 ? "" : "s"}` : "Declined"}
                  </p>
                </div>
                {(r.phone || r.email) && <p className="mt-1 text-sm opacity-60">{[r.phone, r.email].filter(Boolean).join(" · ")}</p>}
                {r.message && <p className="mt-2 text-sm italic opacity-80">&ldquo;{r.message}&rdquo;</p>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
