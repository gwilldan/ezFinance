-- Plans, usage counters and purchased credits for each account.
-- Only the server (service role) touches this table; RLS has no policies.

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
  updated_at timestamptz not null default now()
);

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
  v_allowance := (v_rule ->> p_kind)::integer;

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

-- These run with the table owner's rights, so only the server may call them.
revoke all on function public.roll_usage_period(uuid, boolean) from public, anon, authenticated;
revoke all on function public.consume_usage(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.release_usage(uuid, text, text) from public, anon, authenticated;
revoke all on function public.add_usage_credits(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.roll_usage_period(uuid, boolean) to service_role;
grant execute on function public.consume_usage(uuid, text, jsonb) to service_role;
grant execute on function public.release_usage(uuid, text, text) to service_role;
grant execute on function public.add_usage_credits(uuid, integer, integer) to service_role;
