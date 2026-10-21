"use client";

import { useState } from "react";
import { photoUrl } from "@/lib/storage";
import type { FieldDef } from "@/lib/templates/types";
import { uploadPhoto } from "./photos";

type Value = string | string[] | undefined;

interface Props {
  field: FieldDef;
  value: Value;
  error?: string;
  onChange: (value: Value) => void;
  userId: string;
  invitationId: string;
}

const inputClass =
  "w-full border border-[#2c2a24]/30 bg-white/60 px-4 py-3 text-sm outline-none transition focus:border-[#2c2a24]";

export function FieldInput({ field, value, error, onChange, userId, invitationId }: Props) {
  const id = `f-${field.key}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {field.label}
        {field.required && <span className="text-[#8a6d2f]"> *</span>}
      </label>
      <Control {...{ field, value, onChange, userId, invitationId, id }} />
      {field.help && !error && <p className="mt-1 text-xs opacity-60">{field.help}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function Control({ field, value, onChange, userId, invitationId, id }: Omit<Props, "error"> & { id: string }) {
  const text = typeof value === "string" ? value : "";
  switch (field.type) {
    case "text":
      return (
        <input id={id} className={inputClass} value={text} maxLength={field.max} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      );
    case "textarea":
      return (
        <textarea id={id} rows={4} className={inputClass} value={text} maxLength={field.max} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      );
    case "datetime":
      return <input id={id} type="datetime-local" className={inputClass} value={text} onChange={(e) => onChange(e.target.value)} />;
    case "url":
      return <input id={id} type="url" inputMode="url" className={inputClass} value={text} placeholder="https://maps.app.goo.gl/…" onChange={(e) => onChange(e.target.value)} />;
    case "image":
      return <PhotoInput id={id} paths={text ? [text] : []} max={1} onChange={(p) => onChange(p[0] ?? "")} userId={userId} invitationId={invitationId} />;
    case "images":
      return (
        <PhotoInput id={id} paths={Array.isArray(value) ? value : []} max={field.max ?? 12} onChange={onChange} userId={userId} invitationId={invitationId} />
      );
  }
}

function PhotoInput({
  id,
  paths,
  max,
  onChange,
  userId,
  invitationId,
}: {
  id: string;
  paths: string[];
  max: number;
  onChange: (paths: string[]) => void;
  userId: string;
  invitationId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setProblem("");
    try {
      const next = [...paths];
      for (const file of Array.from(files).slice(0, max - paths.length)) {
        next.push(await uploadPhoto(file, userId, invitationId));
      }
      onChange(next);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {paths.length > 0 && (
        <ul className="mb-3 grid grid-cols-4 gap-2">
          {paths.map((p) => (
            <li key={p} className="group relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => onChange(paths.filter((x) => x !== p))}
                className="absolute right-1 top-1 h-6 w-6 bg-black/70 text-xs text-white opacity-90 transition hover:bg-red-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {paths.length < max && (
        <label htmlFor={id} className="block cursor-pointer border border-dashed border-[#2c2a24]/40 px-4 py-4 text-center text-sm transition hover:border-[#2c2a24]">
          {busy ? "Uploading…" : max === 1 ? "Choose a photo" : `Add photos (${paths.length}/${max})`}
          <input
            id={id}
            type="file"
            accept="image/*"
            multiple={max > 1}
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {problem && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {problem}
        </p>
      )}
    </div>
  );
}
