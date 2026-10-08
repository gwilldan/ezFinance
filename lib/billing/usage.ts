import {
  allowsOverage,
  isMonthlyPlan,
  planAllowance,
  type PlanId,
  type UsageKind,
} from "@/lib/pricing"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import type { UsageMeter, UsageSummary } from "./types"

type UsageSource = "plan" | "credit" | "overage"

type UsageRow = {
  plan: PlanId
  period_start: string
  reports_used: number
  agent_calls_used: number
  report_credits: number
  agent_call_credits: number
  overage_reports: number
  overage_agent_calls: number
  /** The email belonged to a deleted account, which already had the trial. */
  free_trial_used: boolean
}

const PLANS: PlanId[] = ["free", "pro", "business"]

/** The plan rules from lib/pricing.ts, in the shape consume_usage expects. */
const USAGE_RULES = Object.fromEntries(
  PLANS.map((plan) => [
    plan,
    {
      ...planAllowance(plan),
      monthly: isMonthlyPlan(plan),
      overage: allowsOverage(plan),
    },
  ])
)

/**
 * Spends one unit of usage. Returns a handle to give it back if the work
 * fails, or null when the account has nothing left.
 */
export async function spendUsage(userId: string, kind: UsageKind) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc("consume_usage", {
    p_user_id: userId,
    p_kind: kind,
    p_rules: USAGE_RULES,
  })
  if (error) throw new Error(`Usage check failed: ${error.message}`)

  const source = data as UsageSource | null
  if (!source) return null

  return {
    async refund() {
      const { error: refundError } = await supabase.rpc("release_usage", {
        p_user_id: userId,
        p_kind: kind,
        p_source: source,
      })
      if (refundError) console.error("Usage refund failed", refundError)
    },
  }
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const { data, error } = await createSupabaseAdminClient()
    .from("account_usage")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<UsageRow>()
  if (error) throw new Error(`Usage lookup failed: ${error.message}`)

  const row = data ?? emptyRow()
  const monthly = isMonthlyPlan(row.plan)
  // The database rolls the period on the next spend; until then, a period
  // that has already ended should read as fresh.
  const expired = monthly && addMonth(new Date(row.period_start)) <= new Date()
  const allowance = planAllowance(row.plan)
  // A returning email's free allowance shows as spent; consume_usage agrees.
  const trialSpent = row.plan === "free" && row.free_trial_used

  const meter = (
    included: number,
    used: number,
    credits: number,
    overage: number
  ): UsageMeter => {
    const spent = trialSpent ? included : expired ? 0 : used
    return {
      included,
      used: spent,
      credits,
      overage: expired ? 0 : overage,
      remaining: allowsOverage(row.plan)
        ? null
        : Math.max(included - spent, 0) + credits,
    }
  }

  return {
    plan: row.plan,
    periodEnd: monthly ? currentPeriodEnd(row.period_start) : null,
    reports: meter(
      allowance.reports,
      row.reports_used,
      row.report_credits,
      row.overage_reports
    ),
    agentCalls: meter(
      allowance.agentCalls,
      row.agent_calls_used,
      row.agent_call_credits,
      row.overage_agent_calls
    ),
  }
}

function emptyRow(): UsageRow {
  return {
    plan: "free",
    period_start: new Date().toISOString(),
    reports_used: 0,
    agent_calls_used: 0,
    report_credits: 0,
    agent_call_credits: 0,
    overage_reports: 0,
    overage_agent_calls: 0,
    free_trial_used: false,
  }
}

function addMonth(date: Date) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + 1)
  return next
}

/** End of the billing month that contains today. */
function currentPeriodEnd(start: string) {
  let end = addMonth(new Date(start))
  while (end <= new Date()) end = addMonth(end)
  return end.toISOString()
}
