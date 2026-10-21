import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RsvpForm } from "@/components/RsvpForm";
import { TEMPLATE_COMPONENTS } from "@/components/templates";
import { formatLocal } from "@/lib/datetime";
import { titleParts } from "@/lib/invitations";
import { getPublished } from "@/lib/published";
import { getTemplate } from "@/lib/templates/registry";

export async function generateMetadata({ params }: PageProps<"/invite/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublished(slug);
  const template = row && getTemplate(row.template_id);

  // Invitations are link-only: keep them out of search engines.
  const base: Metadata = { robots: { index: false, follow: false } };
  if (!row || row.expired || !template) return { ...base, title: "Invitation" };

  const names = titleParts(template, row.data).join(" & ");
  const when = typeof row.data.eventAt === "string" ? formatLocal(row.data.eventAt, row.locale) : null;
  const venue = typeof row.data.venueName === "string" ? row.data.venueName : "";
  const title = names ? `You're invited: ${names}` : "You're invited";
  const description = [when && `${when.date}, ${when.time}`, venue].filter(Boolean).join(" · ") || "Open your invitation";

  return { ...base, title, description, openGraph: { title, description, type: "website" } };
}

export default function InvitePage({ params }: PageProps<"/invite/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#faf5ea]" />}>
      <Invite params={params} />
    </Suspense>
  );
}

async function Invite({ params }: Pick<PageProps<"/invite/[slug]">, "params">) {
  const { slug } = await params;
  const row = await getPublished(slug);
  if (!row) notFound();

  if (row.expired) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#faf5ea] px-6 text-center text-[#2c2a24]">
        <p className="text-xs uppercase tracking-[0.5em] text-[#8a6d2f]">With thanks</p>
        <h1 className="font-display mt-6 text-5xl italic">This celebration has ended</h1>
        <p className="mt-4 max-w-md opacity-70">The invitation is no longer available. Thank you for being part of the day.</p>
      </main>
    );
  }

  const template = getTemplate(row.template_id);
  const Component = TEMPLATE_COMPONENTS[row.template_id];
  if (!template || !Component || !row.event_at) notFound();

  return <Component data={row.data} locale={row.locale} eventIso={row.event_at} rsvp={<RsvpForm slug={slug} />} />;
}
