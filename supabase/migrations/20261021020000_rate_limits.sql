-- Fixed-window rate limiter used by server actions (RSVP form). Only the
-- service role can touch it; keys are opaque strings such as "rsvp:ip:<hash>".

create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Records one hit and returns true if the caller is still within the limit.
create function public.check_rate_limit(p_key text, p_max int, p_window interval)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - p_window then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - p_window then now() else r.window_start end
  returning r.hits into v_hits;

  -- Opportunistic cleanup keeps the table small without a scheduled job.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end $$;

revoke all on function public.check_rate_limit(text, int, interval) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, interval) to service_role;
