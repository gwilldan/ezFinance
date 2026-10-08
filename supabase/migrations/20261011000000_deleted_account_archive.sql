-- Deleted accounts can't reclaim the free trial by signing up again.
--
-- When a user is deleted, a hash of their email is archived (never the email
-- itself, so a deleted account leaves no readable address behind). A new
-- account whose email matches starts with the free allowance already used.
-- Paid plans and one-time purchases work as normal.
-- Both checks run as triggers on auth.users, so they also cover users
-- deleted or created from the Supabase dashboard.

create table if not exists public.deleted_account_emails (
  email_hash text primary key,
  deleted_at timestamptz not null default now()
);

alter table public.deleted_account_emails enable row level security;

alter table public.account_usage
  add column if not exists free_trial_used boolean not null default false;

-- Folds the usual aliases of one inbox together: case, "+tags", and the dots
-- Gmail ignores. So you+free@gmail.com and Y.ou@gmail.com match you@gmail.com.
create or replace function public.normalize_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  with parts as (
    select
      split_part(split_part(lower(trim(p_email)), '@', 1), '+', 1) as local,
      split_part(lower(trim(p_email)), '@', 2) as domain
  )
  select case
    when domain in ('gmail.com', 'googlemail.com')
      then replace(local, '.', '') || '@gmail.com'
    else local || '@' || domain
  end
  from parts;
$$;

create or replace function public.email_hash(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(public.normalize_email(p_email), 'UTF8')), 'hex');
$$;

create or replace function public.archive_deleted_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email is not null then
    insert into public.deleted_account_emails (email_hash)
    values (public.email_hash(old.email))
    on conflict (email_hash) do update set deleted_at = now();
  end if;
  return old;
end;
$$;

create or replace function public.mark_returning_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and exists (
    select 1 from public.deleted_account_emails
    where email_hash = public.email_hash(new.email)
  ) then
    insert into public.account_usage (user_id, free_trial_used)
    values (new.id, true)
    on conflict (user_id) do update set free_trial_used = true;
  end if;
  return new;
exception when others then
  -- Never block a sign-up over this check.
  raise warning 'mark_returning_account failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists archive_deleted_account on auth.users;
create trigger archive_deleted_account
  before delete on auth.users
  for each row execute function public.archive_deleted_account();

drop trigger if exists mark_returning_account on auth.users;
create trigger mark_returning_account
  after insert on auth.users
  for each row execute function public.mark_returning_account();

revoke all on function public.archive_deleted_account() from public, anon, authenticated;
revoke all on function public.mark_returning_account() from public, anon, authenticated;

-- consume_usage from 20261007000000_account_usage.sql, now honouring
-- free_trial_used. Its grants carry over.
create or replace function public.consume_usage(p_user_id uuid, p_kind text, p_rules jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row account_usage;
  v_rule jsonb;
  v_allowance integer;
begin
  if p_kind not in ('reports', 'agentCalls') then
    raise exception 'Unknown usage kind: %', p_kind;
  end if;

  insert into account_usage (user_id) values (p_user_id) on conflict do nothing;
  select * into v_row from account_usage where user_id = p_user_id for update;
  v_rule := p_rules -> v_row.plan;
  perform roll_usage_period(p_user_id, (v_rule ->> 'monthly')::boolean);
  select * into v_row from account_usage where user_id = p_user_id;
  -- A returning email already had its free allowance.
  v_allowance := case
    when v_row.plan = 'free' and v_row.free_trial_used then 0
    else (v_rule ->> p_kind)::integer
  end;

  if p_kind = 'reports' then
    if v_row.reports_used < v_allowance then
      update account_usage set reports_used = reports_used + 1, updated_at = now() where user_id = p_user_id;
      return 'plan';
    elsif v_row.report_credits > 0 then
      update account_usage set report_credits = report_credits - 1, updated_at = now() where user_id = p_user_id;
      return 'credit';
    elsif (v_rule ->> 'overage')::boolean then
      update account_usage set overage_reports = overage_reports + 1, updated_at = now() where user_id = p_user_id;
      return 'overage';
    end if;
  else
    if v_row.agent_calls_used < v_allowance then
      update account_usage set agent_calls_used = agent_calls_used + 1, updated_at = now() where user_id = p_user_id;
      return 'plan';
    elsif v_row.agent_call_credits > 0 then
      update account_usage set agent_call_credits = agent_call_credits - 1, updated_at = now() where user_id = p_user_id;
      return 'credit';
    elsif (v_rule ->> 'overage')::boolean then
      update account_usage set overage_agent_calls = overage_agent_calls + 1, updated_at = now() where user_id = p_user_id;
      return 'overage';
    end if;
  end if;

  return null;
end;
$$;

