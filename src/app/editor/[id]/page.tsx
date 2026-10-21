import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Editor } from "@/components/editor/Editor";
import type { InvitationRow } from "@/lib/invitations";
import { getTemplate } from "@/lib/templates/registry";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Editor · invite-maker" };

export default function EditorPage({ params }: PageProps<"/editor/[id]">) {
  return (
    <Suspense fallback={<div className="p-10 opacity-60">Loading editor…</div>}>
      <Load params={params} />
    </Suspense>
  );
}

async function Load({ params }: Pick<PageProps<"/editor/[id]">, "params">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // RLS guarantees only the owner's rows come back.
  const { data: inv } = await supabase.from("invitations").select("*").eq("id", id).maybeSingle<InvitationRow>();
  if (!inv || !getTemplate(inv.template_id)) notFound();

  return (
    <Editor
      userId={auth.user.id}
      invitation={{
        id: inv.id,
        slug: inv.slug,
        status: inv.status,
        templateId: inv.template_id,
        timezone: inv.timezone,
        locale: inv.locale,
        data: inv.data,
      }}
    />
  );
}
