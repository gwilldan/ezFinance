import { isMonthlyPlan, PRICING, type PlanId } from "@/lib/pricing"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

/*
 * Plan changes and purchases. Called by the admin script today; a payment
 * webhook (Paystack, Stripe) calls the same functions later.
 */

/**
 * Moves an account to a plan. Paid plans start a fresh billing month; moving
 * back to Free keeps the counters, so the lifetime free allowance isn't reset.
 */
export async function setPlan(userId: string, plan: PlanId) {
  const now = new Date().toISOString()
  const freshPeriod = isMonthlyPlan(plan)
    ? {
        period_start: now,
        reports_used: 0,
        agent_calls_used: 0,
        overage_reports: 0,
        overage_agent_calls: 0,
      }
    : {}

  const { error } = await createSupabaseAdminClient()
    .from("account_usage")
    .upsert({ user_id: userId, plan, ...freshPeriod, updated_at: now })
  if (error) throw new Error(`Could not set plan: ${error.message}`)
}

/** Adds the credits from one or more one-time report purchases. */
export async function addOneTimeReports(userId: string, quantity = 1) {
  const { credits } = PRICING.oneTimeReport
  const { error } = await createSupabaseAdminClient().rpc("add_usage_credits", {
    p_user_id: userId,
    p_reports: credits.reports * quantity,
    p_agent_calls: credits.agentCalls * quantity,
  })
  if (error) throw new Error(`Could not add credits: ${error.message}`)
}

export async function findUserIdByEmail(email: string) {
  const admin = createSupabaseAdminClient().auth.admin
  const target = email.trim().toLowerCase()
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Could not list users: ${error.message}`)
    const user = data.users.find((item) => item.email?.toLowerCase() === target)
    if (user) return user.id
    if (data.users.length < 1000) return null
  }
}
