import type { InvitationData, TemplateDef } from "./templates/types";

export interface InvitationRow {
  id: string;
  owner_id: string;
  template_id: string;
  slug: string;
  locale: string;
  timezone: string;
  data: InvitationData;
  status: "draft" | "published";
  event_at: string | null;
  expires_at: string;
}

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomChars(n: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

function str(v: InvitationData[string]): string {
  return typeof v === "string" ? v.trim() : "";
}

/** The first two text fields with a value (e.g. the couple's names). */
export function titleParts(template: TemplateDef, data: InvitationData): string[] {
  return template.fields
    .filter((f) => f.type === "text")
    .map((f) => str(data[f.key]))
    .filter(Boolean)
    .slice(0, 2);
}

export function invitationTitle(template: TemplateDef | undefined, data: InvitationData): string {
  const parts = template ? titleParts(template, data) : [];
  return parts.length ? parts.join(" & ") : "Untitled invitation";
}

/** Unguessable placeholder used until the first publish. */
export function draftSlug(): string {
  return `draft-${randomChars(10)}`;
}

/** Readable slug from the names plus a random suffix, e.g. `ruq-arsh-k3m9xa`. */
export function publishSlug(template: TemplateDef, data: InvitationData): string {
  const base = titleParts(template, data)
    .map((p) =>
      p
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 5),
    )
    .filter(Boolean)
    .join("-");
  return `${base || "invite"}-${randomChars(6)}`;
}

/** Storage paths of every photo referenced by an invitation's data. */
export function photoPaths(template: TemplateDef, data: InvitationData): string[] {
  const out: string[] = [];
  for (const f of template.fields) {
    const v = data[f.key];
    if (f.type === "image" && typeof v === "string" && v) out.push(v);
    if (f.type === "images" && Array.isArray(v)) out.push(...v);
  }
  return out;
}

/** Drops blank values so "cleared" fields don't fail validation or bloat the row. */
export function cleanData(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      if (v.trim() !== "") out[k] = v;
    } else if (Array.isArray(v)) {
      if (v.length) out[k] = v;
    } else if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out;
}
