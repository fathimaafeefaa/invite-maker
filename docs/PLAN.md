# Free Digital Invitation Maker (Invytor-style) — Draft Plan

## Context
Invytor (invytor.com) lets a host pick an occasion, pick a template, fill in names/date/venue/photos/note, and publish one shareable link (e.g. `/invite/ra-gv3kbc`). Guests open the link, see an animated page with countdown, venue + directions, and an RSVP form; the host sees RSVPs live. Invytor charges ₹199–800 per template.

We are building the **free** version. Goals: easy to create and edit, works for **any occasion** (not only weddings), mobile-first, multilingual (incl. RTL), and cheap enough to run on free tiers.

Agreed so far: Next.js + Supabase, form-based template fields, features = RSVP + dashboard, gallery + map button, auto-expire after event, multi-language.

## Core idea: templates are data, not code
A template = React component + a **field schema** (JSON). The editor is generated from the schema, so adding an occasion/template never needs new editor code.

```
template: { id, occasion, name, fields: [{key, type: text|date|time|textarea|image|images|map|toggle, label, required}], sections: [hero, hosts, datetime, message, countdown, venue, gallery, rsvp] }
invitation.data (jsonb): { values for each field key }
```
A wedding, birthday or housewarming differs only in field labels ("Bride/Groom" vs "Birthday person") and visual theme.

## Data model (Supabase Postgres)
- `invitations` (id, owner_id, template_id, slug unique, locale, data jsonb, status draft|published, event_at, expires_at, created_at)
- `rsvps` (id, invitation_id, name, email?, phone?, attending bool, guest_count, message, created_at)
- Storage bucket `invitation-photos` (path = `{owner_id}/{invitation_id}/…`)
- Access model (see `supabase/migrations/20261021000000_init.sql`): the `anon` role has **no** direct table access. Owners CRUD their own invitations and photos via RLS. Guests load a published invitation through the `get_published_invitation(slug)` function, which returns empty data once expired. RSVPs go through a server action that validates, rate-limits and calls `submit_rsvp(...)`, executable only by `service_role`. `expires_at`, the 20-invitations-per-user cap and size/length limits are enforced in the database, not the UI.

## Key flows
1. **Create:** occasion → template gallery (phone-frame live preview) → form editor with live preview → Publish → copy/share link.
2. **Edit:** same editor, changes go live instantly (edit after publish is a must — Invytor doesn't document it).
3. **Guest:** `/invite/[slug]` server-rendered → animation, countdown, map link, RSVP.
4. **Dashboard:** list of my invitations, RSVP totals (yes/no/guest count), CSV export, unpublish/delete.
5. **Expiry:** `expires_at = event_at + N days` (default 10, like Invytor); expired page shows a polite "event ended" screen; scheduled job (Supabase cron) deletes photos + RSVP personal data after a grace period.

## Cross-cutting
- **Slugs:** short random + readable prefix (`ra-gv3kbc`); collision-checked.
- **WhatsApp preview:** `generateMetadata` + dynamic `opengraph-image` per invite (cover photo + names + date).
- **i18n:** `next-intl`; per-invitation `locale` chosen by host; RTL via `dir`; Noto fonts for Malayalam/Hindi/Arabic.
- **Auth:** Supabase email magic link + Google. Guests never need an account.
- **Abuse/cost:** image resize/compress on upload (max N photos, size cap), RSVP rate-limit + honeypot, per-user invitation cap, auto-expire cleanup.
- **Promo strip:** keep a small "Create yours" footer on invites — free growth loop.

## Phases
0. **Setup:** create GitHub repo `fathimaafeefaa/<name>`, Next.js (TS, Tailwind), Supabase project, CI lint/typecheck, Vercel deploy.
1. **Foundations:** auth, schema + RLS migrations, template registry + field schema.
2. **Editor + 3 templates** (wedding, birthday, housewarming), live preview, photo upload, publish with slug.
3. **Guest page:** sections, countdown, map, RSVP, OG image / WhatsApp preview.
4. **Dashboard:** RSVP list/totals/CSV, edit/unpublish/delete.
5. **Polish:** i18n + RTL, expiry job, animations, a11y, more templates (target ~10), SEO landing page.

## Critical files (to be created)
`app/(marketing)/page.tsx`, `app/templates/page.tsx`, `app/editor/[id]/page.tsx`, `app/invite/[slug]/page.tsx` (+ `opengraph-image.tsx`), `app/dashboard/…`, `lib/templates/registry.ts`, `components/templates/*`, `components/editor/FieldRenderer.tsx`, `supabase/migrations/*.sql`.

## Verification
- Unit: field-schema → form rendering; slug generation; expiry logic.
- Integration: RLS tests (owner vs anon vs other user) against local Supabase.
- E2E (Playwright): create → edit → publish → open link as guest → submit RSVP → see it in dashboard; expired invite shows end screen.
- Manual: paste link into WhatsApp to confirm preview; test Malayalam + Arabic (RTL) on a phone.

## Decided
- Repo: public `fathimaafeefaa/invite-maker` (not created yet; `gh` is already logged in). Never commit Supabase keys.

- Login required (Google + email magic link); guests need no account.
- Template art: original CSS/SVG themes (colors, fonts, borders, animations) — no copied assets.
- Phase order as listed; languages stay in Phase 5 (but keep strings in i18n files and use logical CSS properties from day one so RTL is cheap).
- Phase 0 first actions: `gh repo create fathimaafeefaa/invite-maker --public`, clone into a project folder (e.g. ~/invite-maker), `create-next-app` (TS, Tailwind, App Router), commit README + .env.example, `.gitignore` covers `.env*.local`.

## Open questions for discussion
- Template art: original designs vs open-licensed assets (don't copy Invytor's designs).
- Do you want guest-uploaded photos / WhatsApp RSVP later?

## UI direction (added after kickoff)
Target an Awwwards-level feel, not a generic form-builder look:
- Study current Awwwards "Site of the Day" winners for references (editorial typography, generous whitespace, bold type scale, restrained palette per template).
- Motion: smooth scroll (Lenis), scroll-triggered reveals and a cinematic opening animation per invitation (GSAP or Motion), respecting `prefers-reduced-motion`.
- Each template has its own art direction (type pairing, palette, ornament) built from CSS/SVG; the marketing site and editor share one polished design system.
- Performance is part of the design: fast LCP on mid-range phones over mobile data (guests open links from WhatsApp).

## Implementation notes (Next.js 16)
- `proxy.ts` replaces `middleware.ts`; `params` and `cookies()` are async.
- **Cache Components is on.** Await `params` / `cookies()` / `headers()` inside `<Suspense>`, never at the top of a page; metadata that reads runtime data needs `use cache` or a dynamic marker. The guest page `/invite/[slug]` and its OG image must follow this.
- Supabase auth cookie handling: use `@supabase/ssr`; for server-side auth checks verify the user with the auth server (`getUser`), not an unverified session read.
- Event time is stored as local wall-clock `YYYY-MM-DDTHH:mm` in `data.eventAt` plus `invitations.timezone`; the server derives the `event_at` timestamptz with `localToInstant` (`src/lib/datetime.ts`).

## Testing
- Unit (Vitest): `npm test` covers the schema builder and date maths.
- Database rules: `supabase/tests/rls.sql` checks 42 access rules (owners, other users, anonymous visitors, the server role, expiry, caps, storage, rate limiter) inside one transaction that always aborts, so nothing is persisted. Run it against the linked project:
  `npx supabase db query --linked -f supabase/tests/rls.sql`
  Results are returned as JSON inside the final error message. No Docker needed.
- Status: all three migrations in `supabase/migrations/` are applied to the hosted dev project and all 42 checks pass.

## Progress
- Done: schema + RLS (42 DB checks), template system, sign-in (magic link), dashboard, editor (autosave, photos, live preview, publish), guest page, RSVP form (rate-limited, honeypot), host replies page + CSV export, WhatsApp link preview (OG image + metadata).
- Next: design polish (Awwwards-level pass), more templates/occasions, i18n + RTL, time zone picker, expiry cleanup job, own SMTP for auth emails.

## Lessons from testing
- Template titles come from `TemplateDef.titleFields`; never infer them from field order.
- Templates use container queries (`@2xl:`), not viewport breakpoints, so the editor's phone frame matches real phones.
- Drafts save every valid field and flag only invalid ones; live invitations stay all-or-nothing.
- Photos are uploaded as JPEG (the OG image renderer does not reliably handle WebP).
- The RSVP button stays disabled until hydration; a pre-hydration native submit stores the reply but shows no confirmation.
- Production: set `NEXT_PUBLIC_SITE_URL` to the real https URL, or share links and link-preview images will point at localhost.
- Known: `next start` logs a `Date.now()` prerender warning for `/editor/[id]` at startup. The editor works; cause not yet found.
