import type { PlanId } from "@/lib/pricing"

export type UsageMeter = {
  /** Included with the plan for the current period (lifetime on Free). */
  included: number
  used: number
  /** Purchased one-time credits left. */
  credits: number
  /** Business usage past the allowance this period. */
  overage: number
  /** Units left before the paywall, or null when overage keeps it open. */
  remaining: number | null
}

export type UsageSummary = {
  plan: PlanId
  /** When the monthly allowance resets; null on Free. */
  periodEnd: string | null
  reports: UsageMeter
  agentCalls: UsageMeter
  /** Business pages past the per-report limit this period, billed per page. */
  overagePages: number
}

/** Response code the API sends with HTTP 402 when a limit is reached. */
export const USAGE_LIMIT_CODE = "usage_limit"
