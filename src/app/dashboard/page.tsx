import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DeleteInvitationButton } from "@/components/DeleteInvitationButton";
import { invitationTitle, type InvitationRow } from "@/lib/invitations";
import { getTemplate } from "@/lib/templates/registry";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Your invitations · invite-maker" };

const ERRORS: Record<string, string> = {
  limit: "You've reached the limit of 20 invitations. Delete one to create another.",
  create: "Something went wrong creating the invitation. Please try again.",
};

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<div className="p-10 opacity-60">Loading…</div>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ data: invitations }, { data: rsvps }] = await Promise.all([
    supabase.from("invitations").select("*").order("created_at", { ascending: false }).returns<InvitationRow[]>(),
    supabase.from("rsvps").select("invitation_id, attending, guest_count"),
  ]);

  const totals = new Map<string, { yes: number; no: number; guests: number }>();
  for (const r of rsvps ?? []) {
    const t = totals.get(r.invitation_id) ?? { yes: 0, no: 0, guests: 0 };
    if (r.attending) {
      t.yes += 1;
      t.guests += r.guest_count;
    } else t.no += 1;
    totals.set(r.invitation_id, t);
  }

  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <>
      <AppHeader email={auth.user.email} />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="font-display text-5xl italic">Your invitations</h1>
          <Link href="/new" className="bg-[#2c2a24] px-6 py-3 text-xs uppercase tracking-[0.3em] text-[#faf5ea] transition hover:bg-[#8a6d2f]">
            New invitation
          </Link>
        </div>
        {errorMessage && (
          <p role="alert" className="mt-8 border border-red-700/40 p-4 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        {!invitations?.length ? (
          <div className="mt-16 border border-dashed border-[#2c2a24]/30 p-12 text-center">
            <p className="font-display text-2xl italic">Nothing here yet</p>
            <p className="mt-2 opacity-70">Create your first invitation in a couple of minutes.</p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-4">
            {invitations.map((inv) => {
              const template = getTemplate(inv.template_id);
              const t = totals.get(inv.id);
              return (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-4 border border-[#2c2a24]/20 p-6">
                  <div>
                    <p className="font-display text-2xl italic">{invitationTitle(template, inv.data)}</p>
                    <p className="mt-1 text-sm opacity-60">
                      {template?.name ?? inv.template_id} ·{" "}
                      <span className={inv.status === "published" ? "text-green-800" : ""}>{inv.status === "published" ? "Live" : "Draft"}</span>
                      {t && ` · ${t.yes} attending (${t.guests} guests), ${t.no} declined`}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    {inv.status === "published" && (
                      <Link href={`/invite/${inv.slug}`} target="_blank" className="text-xs uppercase tracking-[0.2em] opacity-70 hover:opacity-100">
                        View
                      </Link>
                    )}
                    <Link href={`/editor/${inv.id}`} className="text-xs uppercase tracking-[0.2em] text-[#8a6d2f]">
                      Edit
                    </Link>
                    <DeleteInvitationButton id={inv.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
