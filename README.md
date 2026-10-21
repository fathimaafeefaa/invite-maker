# invite-maker

Free digital invitations. Pick an occasion, choose a template, fill in your details, and share one link. Works for weddings, birthdays, housewarmings and any other event. Guests can RSVP from the link, and hosts see responses live.

Status: early development. See [docs/PLAN.md](docs/PLAN.md) for the roadmap.

## Stack
Next.js (App Router, TypeScript), Tailwind CSS, Supabase (Postgres, Auth, Storage).

## Getting started
```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```
Open http://localhost:3000.
