import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TEMPLATE_COMPONENTS } from "@/components/templates";
import { getTemplate } from "@/lib/templates/registry";
import type { InvitationData } from "@/lib/templates/types";
import { createPublicClient } from "@/lib/supabase/public";

// Invitations are private-ish links: keep them out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const SLUG = /^[a-z0-9-]{4,40}$/;

export default function InvitePage({ params }: PageProps<"/invite/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#faf5ea]" />}>
      <Invite params={params} />
    </Suspense>
  );
}

interface PublishedRow {
  template_id: string;
  locale: string;
  event_at: string | null;
  expired: boolean;
  data: InvitationData;
}

async function Invite({ params }: Pick<PageProps<"/invite/[slug]">, "params">) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();

  // Anonymous access goes through get_published_invitation(); the tables are closed to anon.
  const { data } = await createPublicClient().rpc("get_published_invitation", { p_slug: slug });
  const row = (data as PublishedRow[] | null)?.[0];
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

  return <Component data={row.data} locale={row.locale} eventIso={row.event_at} />;
}
