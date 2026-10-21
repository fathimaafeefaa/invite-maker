"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { localToInstant } from "@/lib/datetime";
import { cleanData, draftSlug, photoPaths, publishSlug, type InvitationRow } from "@/lib/invitations";
import { getTemplate } from "@/lib/templates/registry";
import { buildDataSchema } from "@/lib/templates/schema";
import type { InvitationData } from "@/lib/templates/types";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "invitation-photos";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser(); // verified with the auth server
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

export async function createInvitation(templateId: string) {
  const template = getTemplate(templateId);
  if (!template) redirect("/new");

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("invitations")
    .insert({ owner_id: user.id, template_id: template.id, slug: draftSlug(), data: {} })
    .select("id")
    .single();

  if (error || !data) {
    redirect(error?.message.includes("limit") ? "/dashboard?error=limit" : "/dashboard?error=create");
  }
  redirect(`/editor/${data.id}`);
}

export type SaveResult =
  | { ok: true; slug: string; status: "draft" | "published"; fieldErrors?: Record<string, string> }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const idSchema = z.string().uuid();

/**
 * Saves the editor's values. Drafts may be incomplete; once published (or when
 * publishing now) every required field must be valid.
 */
export async function saveInvitation(id: string, raw: Record<string, unknown>, publish = false): Promise<SaveResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Invalid invitation." };
  const { supabase } = await requireUser();

  const { data: current } = await supabase.from("invitations").select("*").eq("id", id).maybeSingle<InvitationRow>();
  if (!current) return { ok: false, message: "Invitation not found." };
  const template = getTemplate(current.template_id);
  if (!template) return { ok: false, message: "This template is no longer available." };

  const wantPublished = publish || current.status === "published";
  const schema = buildDataSchema(template, { draft: !wantPublished });
  const cleaned = cleanData(raw);
  let parsed = schema.safeParse(cleaned);

  // Drafts: one bad field must not block saving the rest. Keep each valid
  // field, keep the previously saved value for an invalid one, and flag it.
  let draftErrors: Record<string, string> | undefined;
  if (!parsed.success && !wantPublished) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const merged: Record<string, unknown> = {};
    draftErrors = {};
    for (const [key, value] of Object.entries(cleaned)) {
      if (!shape[key]) continue; // unknown keys are dropped
      if (shape[key].safeParse(value).success) merged[key] = value;
      else {
        draftErrors[key] = "Please check this value";
        if (current.data[key] !== undefined) merged[key] = current.data[key];
      }
    }
    parsed = schema.safeParse(merged);
  }

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.code === "too_small" || issue.code === "invalid_type" ? "Required" : "Please check this value";
    }
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const data = parsed.data as InvitationData;
  const eventLocal = typeof data.eventAt === "string" ? data.eventAt : null;
  const slug = wantPublished && current.slug.startsWith("draft-") ? publishSlug(template, data) : current.slug;

  const { error } = await supabase
    .from("invitations")
    .update({
      data,
      slug,
      status: wantPublished ? "published" : "draft",
      event_at: eventLocal ? localToInstant(eventLocal, current.timezone).toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, message: "Could not save. Please try again." };

  // Best effort: remove photos that are no longer referenced.
  const keep = new Set(photoPaths(template, data));
  const stale = photoPaths(template, current.data).filter((p) => !keep.has(p));
  if (stale.length) await supabase.storage.from(BUCKET).remove(stale);

  return {
    ok: true,
    slug,
    status: wantPublished ? "published" : "draft",
    ...(draftErrors && Object.keys(draftErrors).length ? { fieldErrors: draftErrors } : {}),
  };
}

export async function unpublishInvitation(id: string) {
  if (!idSchema.safeParse(id).success) return;
  const { supabase } = await requireUser();
  await supabase.from("invitations").update({ status: "draft" }).eq("id", id);
}

export async function deleteInvitation(id: string) {
  if (!idSchema.safeParse(id).success) redirect("/dashboard");
  const { supabase, user } = await requireUser();

  const { data: files } = await supabase.storage.from(BUCKET).list(`${user.id}/${id}`, { limit: 100 });
  if (files?.length) await supabase.storage.from(BUCKET).remove(files.map((f) => `${user.id}/${id}/${f.name}`));

  await supabase.from("invitations").delete().eq("id", id);
  redirect("/dashboard");
}
