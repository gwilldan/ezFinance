import type { UsageKind } from "@/lib/pricing"
import { NextResponse } from "next/server"
import { USAGE_LIMIT_CODE } from "./types"

const MESSAGES: Record<UsageKind, string> = {
  reports:
    "You’ve used all your reports. Upgrade or buy a one-time report to analyze another statement.",
  agentCalls:
    "You’ve used all your AI assistant questions. Upgrade or buy a one-time report for more.",
}

/** 402 Payment Required, with a code the client uses to offer an upgrade. */
export function usageLimitResponse(kind: UsageKind) {
  return NextResponse.json(
    { error: MESSAGES[kind], code: USAGE_LIMIT_CODE, kind },
    { status: 402 }
  )
}

/** 402 for a statement longer than what pays for it covers. */
export function pageLimitResponse(pages: number, maxPages: number) {
  return NextResponse.json(
    {
      error: `This statement has ${pages} pages, and your plan covers up to ${maxPages} per report. Upgrade to analyze longer statements.`,
      code: USAGE_LIMIT_CODE,
      kind: "pages",
    },
    { status: 402 }
  )
}
