-- invite-maker: initial schema.
-- Access model: the anon role has NO direct table access. Guests read a
-- published invitation through get_published_invitation(slug) and RSVP
-- through the server (service role) calling submit_rsvp(...).

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  template_id text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{4,40}$'),
  locale      text not null default 'en' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone    text not null default 'Asia/Kolkata' check (length(timezone) between 1 and 64),
  data        jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 32768),
  status      text not null default 'draft' check (status in ('draft', 'published')),
  event_at    timestamptz,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint published_needs_event_at check (status <> 'published' or event_at is not null)
);

create index invitations_owner_idx on public.invitations (owner_id, created_at desc);
create index invitations_expires_idx on public.invitations (expires_at);

create table public.rsvps (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  name          text not null check (length(name) between 1 and 100),
  email         text check (email is null or length(email) <= 200),
  phone         text check (phone is null or length(phone) <= 30),
  attending     boolean not null,
  guest_count   int not null default 1 check (guest_count between 0 and 20),
  message       text check (message is null or length(message) <= 500),
  created_at    timestamptz not null default now()
);

create index rsvps_invitation_idx on public.rsvps (invitation_id, created_at desc);

-- Triggers ------------------------------------------------------------------

-- Expiry is always derived on the server so a client can't extend it.
create function public.set_invitation_expiry() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.expires_at := coalesce(new.event_at, now()) + interval '10 days';
  new.updated_at := now();
  return new;
end $$;

create trigger invitations_set_expiry
  before insert or update on public.invitations
  for each row execute function public.set_invitation_expiry();

-- Per-user cap keeps the free service from being used as bulk storage.
create function public.enforce_invitation_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.invitations where owner_id = new.owner_id) >= 20 then
    raise exception 'Invitation limit reached (20 per account)' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger invitations_cap
  before insert on public.invitations
  for each row execute function public.enforce_invitation_cap();

-- Row level security -----------------------------------------------------------

alter table public.invitations enable row level security;
alter table public.rsvps enable row level security;

revoke all on public.invitations from anon;
revoke all on public.rsvps from anon;
revoke insert, update, delete on public.rsvps from authenticated;

create policy "owners read own invitations" on public.invitations
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "owners create own invitations" on public.invitations
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owners update own invitations" on public.invitations
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "owners delete own invitations" on public.invitations
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "owners read rsvps for own invitations" on public.rsvps
  for select to authenticated using (
    exists (
      select 1 from public.invitations i
      where i.id = rsvps.invitation_id and i.owner_id = (select auth.uid())
    )
  );

-- Guest access ---------------------------------------------------------------

-- Returns one published invitation by its unguessable slug. Expired
-- invitations return an empty data object so personal details disappear.
create function public.get_published_invitation(p_slug text)
returns table (
  template_id text,
  locale      text,
  timezone    text,
  event_at    timestamptz,
  expires_at  timestamptz,
  expired     boolean,
  data        jsonb
)
language sql stable security definer set search_path = '' as $$
  select i.template_id, i.locale, i.timezone, i.event_at, i.expires_at,
         (i.expires_at <= now()) as expired,
         case when i.expires_at <= now() then '{}'::jsonb else i.data end
  from public.invitations i
  where i.slug = p_slug and i.status = 'published'
$$;

revoke all on function public.get_published_invitation(text) from public;
grant execute on function public.get_published_invitation(text) to anon, authenticated;

-- RSVP insert path. Only the server (service role) may call it, after it has
-- validated input and applied rate limiting.
create function public.submit_rsvp(
  p_slug text, p_name text, p_email text, p_phone text,
  p_attending boolean, p_guest_count int, p_message text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.invitations
  where slug = p_slug and status = 'published' and expires_at > now();
  if v_id is null then
    raise exception 'Invitation not found or closed' using errcode = 'P0002';
  end if;
  insert into public.rsvps (invitation_id, name, email, phone, attending, guest_count, message)
  values (v_id, p_name, nullif(p_email, ''), nullif(p_phone, ''), p_attending,
          case when p_attending then p_guest_count else 0 end, nullif(p_message, ''));
end $$;

revoke all on function public.submit_rsvp(text, text, text, text, boolean, int, text) from public, anon, authenticated;
grant execute on function public.submit_rsvp(text, text, text, text, boolean, int, text) to service_role;

-- Photo storage ----------------------------------------------------------------
-- Object path: {owner_id}/{invitation_id}/{file}. Public read (guests load
-- images directly); writes limited to the owner's own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-photos', 'invitation-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "owners upload own photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'invitation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "owners update own photos" on storage.objects
  for update to authenticated using (
    bucket_id = 'invitation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "owners delete own photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'invitation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
