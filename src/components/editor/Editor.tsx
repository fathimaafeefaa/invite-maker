"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveInvitation, unpublishInvitation } from "@/app/actions/invitations";
import { TEMPLATE_COMPONENTS } from "@/components/templates";
import { localToInstant } from "@/lib/datetime";
import { getTemplate } from "@/lib/templates/registry";
import type { FieldDef } from "@/lib/templates/types";
import { RsvpPreview } from "@/components/RsvpForm";
import { FieldInput } from "./FieldInput";

type Values = Record<string, string | string[] | undefined>;
type SaveState = "saved" | "dirty" | "saving" | "error";

interface Props {
  userId: string;
  invitation: {
    id: string;
    slug: string;
    status: "draft" | "published";
    templateId: string;
    timezone: string;
    locale: string;
    data: Values;
  };
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "All changes saved",
  dirty: "Unsaved changes…",
  saving: "Saving…",
  error: "Not saved",
};

function definedValues(values: Values): Values {
  const out: Values = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === "string" ? v.trim() !== "" : Array.isArray(v) && v.length > 0) out[k] = v;
  }
  return out;
}

export function Editor({ userId, invitation }: Props) {
  const template = getTemplate(invitation.templateId)!;
  const Preview = TEMPLATE_COMPONENTS[template.id];

  const [values, setValues] = useState<Values>(invitation.data);
  const valuesRef = useRef<Values>(invitation.data);
  const [status, setStatus] = useState(invitation.status);
  const [slug, setSlug] = useState(invitation.slug);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [version, setVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const persist = useCallback(
    async (publish: boolean) => {
      setSaveState("saving");
      const res = await saveInvitation(invitation.id, valuesRef.current, publish);
      if (res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.fieldErrors ? "Saved, except the highlighted field(s), which need attention." : "");
        setStatus(res.status);
        setSlug(res.slug);
        // An edit made while saving flips this back to "dirty" and wins.
        setSaveState((s) => (s === "saving" ? "saved" : s));
      } else {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.message);
        setSaveState("error");
      }
      return res;
    },
    [invitation.id],
  );

  // Debounced autosave. Drafts save anything; live invitations only save valid data.
  useEffect(() => {
    if (version === 0) return;
    const timer = setTimeout(() => void persist(false), 1200);
    return () => clearTimeout(timer);
  }, [version, persist]);

  function change(key: string, value: string | string[] | undefined) {
    const next = { ...valuesRef.current, [key]: value };
    valuesRef.current = next;
    setValues(next);
    setSaveState("dirty");
    setVersion((v) => v + 1);
  }

  async function publish() {
    setPublishing(true);
    await persist(true);
    setPublishing(false);
  }

  async function unpublish() {
    await unpublishInvitation(invitation.id);
    setStatus("draft");
  }

  const groups = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    for (const f of template.fields) map.set(f.group, [...(map.get(f.group) ?? []), f]);
    return [...map.entries()];
  }, [template]);

  const previewData = { ...template.sample, ...definedValues(values) };
  let eventIso: string;
  try {
    eventIso = localToInstant(String(previewData.eventAt), invitation.timezone).toISOString();
  } catch {
    eventIso = localToInstant(String(template.sample.eventAt), invitation.timezone).toISOString();
  }

  const url = `${SITE}/invite/${slug}`;
  const live = status === "published";

  return (
    <div className="flex min-h-dvh flex-col bg-[#faf5ea] text-[#2c2a24]">
      <header className="sticky top-0 z-20 border-b border-[#2c2a24]/15 bg-[#faf5ea]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xs uppercase tracking-[0.25em] opacity-70 hover:opacity-100">
              ← Back
            </Link>
            <span className={`text-xs ${saveState === "error" ? "text-red-700" : "opacity-60"}`} aria-live="polite">
              {SAVE_LABEL[saveState]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {live && (
              <span className="hidden text-xs uppercase tracking-[0.2em] text-green-800 sm:inline">● Live</span>
            )}
            {!live && (
              <button
                onClick={publish}
                disabled={publishing}
                className="bg-[#2c2a24] px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-[#faf5ea] transition hover:bg-[#8a6d2f] disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
            )}
          </div>
        </div>
        <div className="flex border-t border-[#2c2a24]/10 lg:hidden">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs uppercase tracking-[0.25em] ${tab === t ? "border-b-2 border-[#2c2a24]" : "opacity-50"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className={`${tab === "edit" ? "block" : "hidden"} lg:block`}>
          {live && (
            <section className="mb-8 border border-green-800/30 bg-green-800/5 p-5">
              <p className="font-display text-xl italic">Your invitation is live</p>
              <p className="mt-1 text-sm opacity-70">Edits save automatically and appear on the link straight away.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 border border-[#2c2a24]/30 bg-white px-3 py-2 text-sm" aria-label="Invitation link" />
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                  className="bg-[#2c2a24] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#faf5ea]"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="border border-[#2c2a24] px-4 py-2 text-xs uppercase tracking-[0.2em]">
                  Open
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`You're invited! ${url}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[#2c2a24] px-4 py-2 text-xs uppercase tracking-[0.2em]"
                >
                  WhatsApp
                </a>
              </div>
              <button onClick={unpublish} className="mt-4 text-xs uppercase tracking-[0.2em] opacity-60 hover:opacity-100">
                Unpublish
              </button>
            </section>
          )}

          {message && (
            <p role="alert" className="mb-6 border border-red-700/40 p-3 text-sm text-red-700">
              {message}
              {live && " Your live invitation still shows the last valid version."}
            </p>
          )}

          <div className="space-y-10">
            {groups.map(([group, fields]) => (
              <fieldset key={group} className="space-y-5">
                <legend className="font-display mb-2 text-2xl italic">{group}</legend>
                {fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={values[f.key]}
                    error={errors[f.key]}
                    onChange={(v) => change(f.key, v)}
                    userId={userId}
                    invitationId={invitation.id}
                  />
                ))}
              </fieldset>
            ))}
          </div>
        </div>

        <aside className={`${tab === "preview" ? "block" : "hidden"} lg:block`}>
          <div className="sticky top-24">
            <div
              className="mx-auto w-[375px] max-w-full overflow-hidden rounded-[2.5rem] border-[10px] border-[#1f1d19] bg-black shadow-2xl"
              style={{ "--frame-h": "640px" } as React.CSSProperties}
            >
              <div className="h-[640px] overflow-y-auto overscroll-contain">
                <Preview data={previewData} locale={invitation.locale} eventIso={eventIso} rsvp={<RsvpPreview />} />
              </div>
            </div>
            <p className="mt-3 text-center text-xs opacity-50">Sample text shows where blank fields will appear.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
