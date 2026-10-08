import { answerQuestion } from "@/lib/bank-statement/chat"
import { usageLimitResponse } from "@/lib/billing/paywall"
import { spendUsage } from "@/lib/billing/usage"
import type { StatementReport } from "@/lib/bank-statement/schema"
import { getCloudReport, saveCloudMessages } from "@/lib/reports/server"
import { MAX_SAVED_MESSAGES, toMessages } from "@/lib/reports/types"
import { getUserByAccessToken } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const MAX_HISTORY = 12
const MAX_MESSAGE_CHARS = 4_000

/**
 * Answers a question about one statement. A cloud report is loaded and its
 * chat saved here; a device report arrives in the body and the browser keeps
 * its chat.
 */
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
    const reportId = typeof body?.reportId === "string" ? body.reportId : null
    const cloud =
      body?.storage === "cloud" && reportId
        ? await getCloudReport(user.id, reportId)
        : null
    if (body?.storage === "cloud" && !cloud) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 })
    }

    const report =
      cloud?.report ?? (body?.report as StatementReport | undefined)
    const messages = toMessages(body?.messages, MAX_SAVED_MESSAGES).map(
      ({ role, content }) => ({
        role,
        content: content.slice(0, MAX_MESSAGE_CHARS),
      })
    )
    const history = messages.slice(-MAX_HISTORY)

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

    let answer: string
    try {
      answer = await answerQuestion(report, history)
    } catch (error) {
      // A failed answer doesn't use up a question.
      await spend.refund()
      throw error
    }

    if (cloud) {
      await saveCloudMessages(
        user.id,
        cloud.id,
        [...messages, { role: "assistant" as const, content: answer }].slice(
          -MAX_SAVED_MESSAGES
        )
      ).catch((error) => console.error("Chat save failed", error))
    }
    return NextResponse.json({ answer })
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
