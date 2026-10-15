-- The whole ezFinance database in one file: run it once on a new Supabase
-- project. Every statement is safe to run again, so it also brings an
-- existing database's functions, triggers and grants up to date.
--
-- Only the server (service role) touches these tables, so RLS is on with no
-- policies, and the functions run with the owner's rights but can only be
-- called by the service role.

--------------------------------------------------------------------------------
-- Usage: plans, counters and purchased credits for each account
--------------------------------------------------------------------------------

create table if not exists public.account_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  -- Start of the current billing month (paid plans only).
  period_start timestamptz not null default now(),
  reports_used integer not null default 0 check (reports_used >= 0),
  agent_calls_used integer not null default 0 check (agent_calls_used >= 0),
  -- One-time purchases. They never expire and survive plan changes.
  report_credits integer not null default 0 check (report_credits >= 0),
  agent_call_credits integer not null default 0 check (agent_call_credits >= 0),
  -- Business usage past the allowance in the current period, for billing.
  overage_reports integer not null default 0 check (overage_reports >= 0),
  overage_agent_calls integer not null default 0 check (overage_agent_calls >= 0),
  -- Business pages past the per-report limit in the current period.
  overage_pages integer not null default 0 check (overage_pages >= 0),
  -- The email belonged to a deleted account, which already had the trial.
  free_trial_used boolean not null default false,
  updated_at timestamptz not null default now()
);

-- The Bachs subscription paying for the plan, so its cancellation finds the
-- account. Added after the table, so existing databases get it too.
alter table public.account_usage add column if not exists bachs_subscription_id text unique;

alter table public.account_usage enable row level security;

-- Moves a paid plan's period forward to the current month, clearing usage.
create or replace function public.roll_usage_period(p_user_id uuid, p_monthly boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
begin
  select period_start into v_start from account_usage where user_id = p_user_id for update;
  if not p_monthly or v_start + interval '1 month' > now() then
    return;
  end if;

  while v_start + interval '1 month' <= now() loop
    v_start := v_start + interval '1 month';
  end loop;

  update account_usage
  set period_start = v_start,
      reports_used = 0,
      agent_calls_used = 0,
      overage_reports = 0,
      overage_agent_calls = 0,
      overage_pages = 0,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- Spends one unit of p_kind ('reports' or 'agentCalls'): the plan allowance
-- first, then purchased credits, then overage when the plan allows it.
-- p_rules maps each plan to {"reports", "agentCalls", "monthly", "overage"}
-- (built from lib/pricing.ts). Returns 'plan', 'credit', 'overage', or null
-- when the account has nothing left.
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

-- Gives back what consume_usage spent, e.g. when an upload fails.
create or replace function public.release_usage(p_user_id uuid, p_kind text, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update account_usage set
    reports_used = case when p_kind = 'reports' and p_source = 'plan' then greatest(reports_used - 1, 0) else reports_used end,
    report_credits = case when p_kind = 'reports' and p_source = 'credit' then report_credits + 1 else report_credits end,
    overage_reports = case when p_kind = 'reports' and p_source = 'overage' then greatest(overage_reports - 1, 0) else overage_reports end,
    agent_calls_used = case when p_kind = 'agentCalls' and p_source = 'plan' then greatest(agent_calls_used - 1, 0) else agent_calls_used end,
    agent_call_credits = case when p_kind = 'agentCalls' and p_source = 'credit' then agent_call_credits + 1 else agent_call_credits end,
    overage_agent_calls = case when p_kind = 'agentCalls' and p_source = 'overage' then greatest(overage_agent_calls - 1, 0) else overage_agent_calls end,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- Adds purchased credits (a one-time report purchase).
create or replace function public.add_usage_credits(p_user_id uuid, p_reports integer, p_agent_calls integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into account_usage (user_id) values (p_user_id) on conflict do nothing;
  update account_usage
  set report_credits = report_credits + p_reports,
      agent_call_credits = agent_call_credits + p_agent_calls,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- Adds the extra pages of one finished Business report. The upload spent the
-- report first, so the period has already been rolled.
create or replace function public.add_page_overage(p_user_id uuid, p_pages integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pages <= 0 then
    return;
  end if;
  update account_usage
  set overage_pages = overage_pages + p_pages,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

--------------------------------------------------------------------------------
-- Billing: Bachs webhook events already handled
--------------------------------------------------------------------------------

-- Bachs delivers each webhook at least once; its event id is recorded here so
-- a repeat delivery doesn't grant the same purchase twice.
create table if not exists public.billing_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

--------------------------------------------------------------------------------
-- Reports: where each analyzed statement is kept
--------------------------------------------------------------------------------

-- Every analyzed statement gets a row that records where it is kept, so a
-- report is looked up where it was saved, not where the current setting
-- points. Cloud rows also hold the summary, report and chat as AES-256-GCM
-- ciphertext (see lib/reports/crypto.ts), so the database never sees them in
-- the clear. Device rows hold only the location; the report itself never
-- leaves the browser.
create table if not exists public.statement_reports (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage text not null check (storage in ('local', 'cloud')),
  generated_at timestamptz not null,
  summary text,
  report text,
  messages text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint statement_reports_data_matches_storage check (
    (storage = 'cloud' and summary is not null and report is not null and messages is not null)
    or (storage = 'local' and summary is null and report is null and messages is null)
  )
);

create index if not exists statement_reports_user_generated_idx
  on public.statement_reports (user_id, generated_at desc);

alter table public.statement_reports enable row level security;

--------------------------------------------------------------------------------
-- Accounts: sign-up checks and deleted accounts
--------------------------------------------------------------------------------

-- How an email is already registered, so sign-up can tell a person to sign in
-- (or continue with Google) instead of creating a second account.
-- Returns the providers linked to that email, e.g. {email} or {google}; an
-- empty array when the email is free.
create or replace function public.email_sign_in_methods(p_email text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct i.provider order by i.provider), '{}')
  from auth.users u
  join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(trim(p_email))
    and u.deleted_at is null;
$$;

-- Deleted accounts can't reclaim the free trial by signing up again.
-- When a user is deleted, a hash of their email is archived (never the email
-- itself, so a deleted account leaves no readable address behind). A new
-- account whose email matches starts with the free allowance already used.
-- Paid plans and one-time purchases work as normal. Both checks run as
-- triggers on auth.users, so they also cover users deleted or created from
-- the Supabase dashboard.
create table if not exists public.deleted_account_emails (
  email_hash text primary key,
  deleted_at timestamptz not null default now()
);

alter table public.deleted_account_emails enable row level security;

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

--------------------------------------------------------------------------------
-- Permissions: only the server may call these
--------------------------------------------------------------------------------

revoke all on function public.roll_usage_period(uuid, boolean) from public, anon, authenticated;
revoke all on function public.consume_usage(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.release_usage(uuid, text, text) from public, anon, authenticated;
revoke all on function public.add_usage_credits(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.add_page_overage(uuid, integer) from public, anon, authenticated;
revoke all on function public.email_sign_in_methods(text) from public, anon, authenticated;
revoke all on function public.archive_deleted_account() from public, anon, authenticated;
revoke all on function public.mark_returning_account() from public, anon, authenticated;

grant execute on function public.roll_usage_period(uuid, boolean) to service_role;
grant execute on function public.consume_usage(uuid, text, jsonb) to service_role;
grant execute on function public.release_usage(uuid, text, text) to service_role;
grant execute on function public.add_usage_credits(uuid, integer, integer) to service_role;
grant execute on function public.add_page_overage(uuid, integer) to service_role;
grant execute on function public.email_sign_in_methods(text) to service_role;
