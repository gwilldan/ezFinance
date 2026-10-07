import { answerQuestion, type ChatMessage } from "@/lib/bank-statement/chat"
import { usageLimitResponse } from "@/lib/billing/paywall"
import { spendUsage } from "@/lib/billing/usage"
import type { StatementReport } from "@/lib/bank-statement/schema"
import { getUserByAccessToken } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const MAX_HISTORY = 12
const MAX_MESSAGE_CHARS = 4_000

export async function POST(request: NextRequest) {
  try {
    const user = await getUserByAccessToken()
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)
    const report = body?.report as StatementReport | undefined
    const history = toHistory(body?.messages)

    if (
      !Array.isArray(report?.transactions) ||
      history.at(-1)?.role !== "user"
    ) {
      return NextResponse.json(
        { error: "A report and a question are required." },
        { status: 400 }
      )
    }

    const spend = await spendUsage(user.id, "agentCalls")
    if (!spend) return usageLimitResponse("agentCalls")

    try {
      const answer = await answerQuestion(report, history)
      return NextResponse.json({ answer })
    } catch (error) {
      // A failed answer doesn't use up a question.
      await spend.refund()
      throw error
    }
  } catch (error) {
    console.error("Chat error", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to answer question",
      },
      { status: 500 }
    )
  }
}

function toHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is ChatMessage =>
        (item?.role === "user" || item?.role === "assistant") &&
        typeof item.content === "string"
    )
    .slice(-MAX_HISTORY)
    .map(({ role, content }) => ({
      role,
      content: content.slice(0, MAX_MESSAGE_CHARS),
    }))
}
