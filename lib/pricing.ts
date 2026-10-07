/**
 * Every price and limit in one place. The pricing page, landing teaser and
 * paywall all read from here, so changing a number here changes it everywhere.
 */

export type PlanId = "free" | "pro" | "business"
export type UsageKind = "reports" | "agentCalls"

export type Allowance = Record<UsageKind, number>

export const PRICING = {
  currency: "USD",

  /** Lifetime allowance for every signed-in account. */
  free: {
    allowance: { reports: 1, agentCalls: 3 },
  },

  /** A one-time purchase adds these credits. They never expire. */
  oneTimeReport: {
    price: 5,
    credits: { reports: 1, agentCalls: 10 },
  },

  /** Paid plans: the allowance resets every billing month. */
  pro: {
    monthly: 14,
    yearly: 108,
    allowance: { reports: 20, agentCalls: 100 },
  },

  business: {
    monthly: 39,
    yearly: 288,
    allowance: { reports: 100, agentCalls: 500 },
    /** Business keeps working past its allowance and pays per use. */
    overage: {
      perReport: 1,
      perAgentCallBlock: { price: 1, calls: 100 },
    },
  },
} as const

/** Usage included with a plan; free is lifetime, paid plans are per month. */
export function planAllowance(plan: PlanId): Allowance {
  return plan === "free" ? PRICING.free.allowance : PRICING[plan].allowance
}

export const isMonthlyPlan = (plan: PlanId) => plan !== "free"
export const allowsOverage = (plan: PlanId) => plan === "business"

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: PRICING.currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

/** Whole-percent saving of paying yearly instead of 12 monthly payments. */
export function yearlySaving({
  monthly,
  yearly,
}: {
  monthly: number
  yearly: number
}) {
  return Math.round((1 - yearly / (monthly * 12)) * 100)
}
