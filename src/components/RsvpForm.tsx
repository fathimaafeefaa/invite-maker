"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { submitRsvp, type RsvpState } from "@/app/actions/rsvp";

const input =
  "w-full border border-current/30 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-current";

function Field({ label, error, children, id }: { label: string; error?: string; children: React.ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs uppercase tracking-[0.2em] opacity-70">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const noopSubscribe = () => () => {};

export function RsvpForm({ slug }: { slug: string }) {
  // False on the server and during hydration, true once the page is interactive.
  // Submitting before that would post as a plain form and show no confirmation.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [state, action, pending] = useActionState<RsvpState, FormData>(submitRsvp.bind(null, slug), { status: "idle" });
  const [attending, setAttending] = useState("yes");
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "ok") {
    return (
      <div className="text-center" role="status">
        <p className="font-display text-3xl italic">Thank you!</p>
        <p className="mt-3 opacity-75">Your reply has been sent. We can&apos;t wait to celebrate with you.</p>
      </div>
    );
  }

  return (
    <form action={action} className="mx-auto max-w-md space-y-5 text-left">
      <Field id="rsvp-name" label="Your name" error={errors.name}>
        <input id="rsvp-name" name="name" required maxLength={100} autoComplete="name" className={input} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 block text-xs uppercase tracking-[0.2em] opacity-70">Will you join us?</legend>
        <div className="grid gap-2 @2xl:grid-cols-2">
          {[
            ["yes", "Joyfully accepting"],
            ["no", "Regretfully declining"],
          ].map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer border px-4 py-3 text-center text-sm transition ${attending === value ? "border-current bg-current/10" : "border-current/30"}`}
            >
              <input
                type="radio"
                name="attending"
                value={value}
                checked={attending === value}
                onChange={() => setAttending(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {attending === "yes" && (
        <Field id="rsvp-guests" label="How many guests (including you)?" error={errors.guests}>
          <input id="rsvp-guests" name="guests" type="number" min={1} max={20} defaultValue={1} className={input} />
        </Field>
      )}

      <div className="grid gap-5 @2xl:grid-cols-2">
        <Field id="rsvp-phone" label="Phone (optional)" error={errors.phone}>
          <input id="rsvp-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className={input} />
        </Field>
        <Field id="rsvp-email" label="Email (optional)" error={errors.email}>
          <input id="rsvp-email" name="email" type="email" maxLength={200} autoComplete="email" className={input} />
        </Field>
      </div>

      <Field id="rsvp-message" label="A note for the hosts (optional)" error={errors.message}>
        <textarea id="rsvp-message" name="message" rows={3} maxLength={500} className={input} />
      </Field>

      {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button
        disabled={pending || !hydrated}
        className="w-full bg-current px-6 py-4 text-xs uppercase tracking-[0.3em] disabled:opacity-50"
      >
        <span className="text-[#faf5ea]">{pending ? "Sending…" : "Send reply"}</span>
      </button>
    </form>
  );
}

/** Non-interactive look-alike for the editor preview. */
export function RsvpPreview() {
  return (
    <div className="mx-auto max-w-md space-y-4 text-left opacity-80" aria-hidden="true">
      {["Your name", "Will you join us?", "Phone (optional)"].map((label) => (
        <div key={label}>
          <p className="mb-1.5 text-xs uppercase tracking-[0.2em] opacity-70">{label}</p>
          <div className="h-11 border border-current/30" />
        </div>
      ))}
      <div className="bg-current px-6 py-4 text-center text-xs uppercase tracking-[0.3em]">
        <span className="text-[#faf5ea]">Send reply</span>
      </div>
    </div>
  );
}
