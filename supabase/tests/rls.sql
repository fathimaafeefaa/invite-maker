-- Row-level-security and function tests. Runs in ONE transaction that always
-- aborts at the end, so nothing is ever persisted. Results come back inside
-- the final error message as JSON: [{"name":..., "ok": true|false, "detail":...}].
-- Run:  supabase db query --linked -f supabase/tests/rls.sql
begin;
create temp table results (name text, ok boolean, detail text);
grant all on results to public;

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-a@example.invalid', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-b@example.invalid', now(), now());

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a1"}', true);

do $$ begin
  insert into public.invitations (owner_id, template_id, slug, status, event_at) values ('00000000-0000-0000-0000-0000000000a1','wedding-classic','test-live', 'published', now() + interval '1 day');
  insert into results values ('owner can create an invitation', true, null);
exception when others then insert into results values ('owner can create an invitation', false, sqlerrm); end $$;

do $$ begin
  insert into public.invitations (owner_id, template_id, slug) values ('00000000-0000-0000-0000-0000000000b2','wedding-classic','test-steal');
  insert into results values ('owner cannot create an invitation owned by someone else', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('owner cannot create an invitation owned by someone else', true, sqlerrm); end $$;

do $$ begin
  insert into public.invitations (owner_id, template_id, slug, status) values ('00000000-0000-0000-0000-0000000000a1','wedding-classic','test-noevent', 'published');
  insert into results values ('cannot publish without an event date', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('cannot publish without an event date', true, sqlerrm); end $$;

do $$ begin
  insert into public.invitations (owner_id, template_id, slug, event_at, expires_at) values ('00000000-0000-0000-0000-0000000000a1','wedding-classic','test-expiry', now() + interval '1 day', now() + interval '1 year');
  insert into results values ('owner can create a draft', true, null);
exception when others then insert into results values ('owner can create a draft', false, sqlerrm); end $$;

do $$ declare c bigint; begin
  select count(*) into c from public.invitations where slug='test-expiry' and expires_at < now() + interval '12 days';
  insert into results values ('client-supplied expires_at is ignored (derived from event date)', c = 1, 'count=' || c);
exception when others then insert into results values ('client-supplied expires_at is ignored (derived from event date)', false, sqlerrm); end $$;

do $$ begin
  insert into public.invitations (owner_id, template_id, slug) values ('00000000-0000-0000-0000-0000000000a1','wedding-classic','Bad Slug!');
  insert into results values ('invalid slug is rejected', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('invalid slug is rejected', true, sqlerrm); end $$;

do $$ begin
  insert into public.invitations (owner_id, template_id, slug, data) values ('00000000-0000-0000-0000-0000000000a1','wedding-classic','test-big', jsonb_build_object('x', repeat('a', 40000)));
  insert into results values ('oversized data is rejected', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('oversized data is rejected', true, sqlerrm); end $$;

do $$ begin
  update public.invitations set owner_id = '00000000-0000-0000-0000-0000000000b2' where slug = 'test-live';
  insert into results values ('owner cannot hand an invitation to another user', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('owner cannot hand an invitation to another user', true, sqlerrm); end $$;

do $$ begin
  insert into public.invitations (owner_id, template_id, slug) select '00000000-0000-0000-0000-0000000000a1','wedding-classic','cap-' || g from generate_series(1,18) g;
  insert into results values ('owner can fill up to the 20 invitation cap', true, null);
exception when others then insert into results values ('owner can fill up to the 20 invitation cap', false, sqlerrm); end $$;

do $$ begin
  insert into public.invitations (owner_id, template_id, slug) values ('00000000-0000-0000-0000-0000000000a1','wedding-classic','cap-over');
  insert into results values ('21st invitation is rejected', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('21st invitation is rejected', true, sqlerrm); end $$;

do $$ declare c bigint; begin
  select count(*) into c from public.invitations;
  insert into results values ('owner sees exactly their own 20', c = 20, 'count=' || c);
exception when others then insert into results values ('owner sees exactly their own 20', false, sqlerrm); end $$;

do $$ begin
  insert into public.rsvps (invitation_id, name, attending) select id, 'x', true from public.invitations limit 1;
  insert into results values ('authenticated users cannot insert RSVPs directly', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('authenticated users cannot insert RSVPs directly', true, sqlerrm); end $$;

do $$ begin
  perform public.submit_rsvp('test-live','x','','',true,1,'');
  insert into results values ('authenticated users cannot call submit_rsvp', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('authenticated users cannot call submit_rsvp', true, sqlerrm); end $$;

do $$ begin
  insert into storage.objects (bucket_id, name) values ('invitation-photos', '00000000-0000-0000-0000-0000000000a1/inv1/photo.png');
  insert into results values ('owner can upload a photo to their own folder', true, null);
exception when others then insert into results values ('owner can upload a photo to their own folder', false, sqlerrm); end $$;

do $$ begin
  insert into storage.objects (bucket_id, name) values ('invitation-photos', '00000000-0000-0000-0000-0000000000b2/inv1/photo.png');
  insert into results values ('owner cannot upload into another user''s folder', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('owner cannot upload into another user''s folder', true, sqlerrm); end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000b2"}', true);

do $$ declare c bigint; begin
  select count(*) into c from public.invitations;
  insert into results values ('other user sees none of A''s invitations', c = 0, 'count=' || c);
exception when others then insert into results values ('other user sees none of A''s invitations', false, sqlerrm); end $$;

do $$ declare n int; begin
  update public.invitations set data = '{"hack":1}' where slug = 'test-live';
  get diagnostics n = row_count;
  insert into results values ('other user cannot update A''s invitation', n = 0, 'rows=' || n);
exception when others then insert into results values ('other user cannot update A''s invitation', false, sqlerrm); end $$;
do $$ declare n int; begin
  delete from public.invitations where slug = 'test-live';
  get diagnostics n = row_count;
  insert into results values ('other user cannot delete A''s invitation', n = 0, 'rows=' || n);
exception when others then insert into results values ('other user cannot delete A''s invitation', false, sqlerrm); end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ begin
  perform count(*) from public.invitations;
  insert into results values ('anon cannot read invitations table', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('anon cannot read invitations table', true, sqlerrm); end $$;

do $$ begin
  perform count(*) from public.rsvps;
  insert into results values ('anon cannot read rsvps table', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('anon cannot read rsvps table', true, sqlerrm); end $$;

do $$ declare c bigint; begin
  select count(*) into c from public.get_published_invitation('test-live') where not expired and data is not null;
  insert into results values ('anon can load a published invitation by slug', c = 1, 'count=' || c);
exception when others then insert into results values ('anon can load a published invitation by slug', false, sqlerrm); end $$;

do $$ declare c bigint; begin
  select count(*) into c from public.get_published_invitation('cap-1');
  insert into results values ('anon cannot load a draft by slug', c = 0, 'count=' || c);
exception when others then insert into results values ('anon cannot load a draft by slug', false, sqlerrm); end $$;

do $$ begin
  perform public.submit_rsvp('test-live','x','','',true,1,'');
  insert into results values ('anon cannot call submit_rsvp', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('anon cannot call submit_rsvp', true, sqlerrm); end $$;

do $$ begin
  insert into storage.objects (bucket_id, name) values ('invitation-photos', 'anon/x/y.png');
  insert into results values ('anon cannot upload photos', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('anon cannot upload photos', true, sqlerrm); end $$;

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$ begin
  perform public.submit_rsvp('test-live','Guest One','','',true,3,'hi');
  insert into results values ('server can submit an RSVP', true, null);
exception when others then insert into results values ('server can submit an RSVP', false, sqlerrm); end $$;

do $$ begin
  perform public.submit_rsvp('test-live','Guest Two','a@b.c','',false,5,'');
  insert into results values ('declining RSVP is accepted', true, null);
exception when others then insert into results values ('declining RSVP is accepted', false, sqlerrm); end $$;

do $$ declare c bigint; begin
  select count(*) into c from public.rsvps where name='Guest Two' and guest_count=0;
  insert into results values ('declining RSVP forces guest_count to 0', c = 1, 'count=' || c);
exception when others then insert into results values ('declining RSVP forces guest_count to 0', false, sqlerrm); end $$;

do $$ begin
  perform public.submit_rsvp('test-live','Guest Three','','',true,99,'');
  insert into results values ('absurd guest count is rejected', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('absurd guest count is rejected', true, sqlerrm); end $$;

do $$ begin
  perform public.submit_rsvp('cap-1','Guest Four','','',true,1,'');
  insert into results values ('RSVP to an unpublished invitation is rejected', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('RSVP to an unpublished invitation is rejected', true, sqlerrm); end $$;

do $$ begin
  update public.invitations set event_at = now() - interval '11 days' where slug = 'test-live';
  insert into results values ('event date moves into the past', true, null);
exception when others then insert into results values ('event date moves into the past', false, sqlerrm); end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ declare c bigint; begin
  select count(*) into c from public.get_published_invitation('test-live') where expired and data = '{}'::jsonb;
  insert into results values ('expired invitation is flagged and its data is blanked', c = 1, 'count=' || c);
exception when others then insert into results values ('expired invitation is flagged and its data is blanked', false, sqlerrm); end $$;

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$ begin
  perform public.submit_rsvp('test-live','Late Guest','','',true,1,'');
  insert into results values ('RSVP to an expired invitation is rejected', false, 'statement unexpectedly succeeded');
exception when others then insert into results values ('RSVP to an expired invitation is rejected', true, sqlerrm); end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a1"}', true);

do $$ declare c bigint; begin
  select count(*) into c from public.rsvps;
  insert into results values ('owner can read RSVPs for their own invitation', c = 2, 'count=' || c);
exception when others then insert into results values ('owner can read RSVPs for their own invitation', false, sqlerrm); end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000b2"}', true);

do $$ declare c bigint; begin
  select count(*) into c from public.rsvps;
  insert into results values ('other user cannot read A''s RSVPs', c = 0, 'count=' || c);
exception when others then insert into results values ('other user cannot read A''s RSVPs', false, sqlerrm); end $$;

reset role;
do $$ begin
  raise exception 'RESULTS:%', (select json_agg(json_build_object('name', name, 'ok', ok, 'detail', left(detail, 90))) from results);
end $$;
