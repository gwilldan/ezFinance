import { usageLimitResponse } from "@/lib/billing/paywall"
import { spendUsage } from "@/lib/billing/usage"
import { buildReport } from "@/lib/bank-statement/build-report"
import { elapsed, extractTransactions } from "@/lib/bank-statement/extract"
import { PdfPasswordError, readPdfPages } from "@/lib/bank-statement/pdf"
import { saveCloudReport } from "@/lib/reports/server"
import { reportStorageOf, type ReportStorage } from "@/lib/reports/types"
import { getUserByAccessToken } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const user = await getUserByAccessToken()
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    // Only ever passed to the PDF reader: never logged, stored or returned.
    const password = formData.get("password")

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }

    const spend = await spendUsage(user.id, "reports")
    if (!spend) return usageLimitResponse("reports")

    // Only a finished report counts; anything else gives the report back.
    const response = await analyzeStatement(
      file,
      typeof password === "string" && password ? password : undefined,
      { userId: user.id, storage: reportStorageOf(user.user_metadata) }
    ).catch(errorResponse)
    if (!response.ok) await spend.refund()
    return response
  } catch (error) {
    return errorResponse(error)
  }
}

async function analyzeStatement(
  file: File,
  password: string | undefined,
  owner: { userId: string; storage: ReportStorage }
) {
  const startedAt = performance.now()
  const { pages, total } = await readPdfPages(
    new Uint8Array(await file.arrayBuffer()),
    password
  )
  console.info(`[upload] parsed ${total} pages: ${elapsed(startedAt)}`)
  const { transactions, currency } = await extractTransactions(pages)

  if (transactions.length === 0) {
    return NextResponse.json(
      {
        error:
          "We could not find transaction rows in this PDF. Try a text-based statement or an OCR-enabled workflow.",
      },
      { status: 422 }
    )
  }

  const report = buildReport(transactions, {
    fileName: file.name || "Bank statement.pdf",
    pages: total,
    currency,
  })

  const id = randomUUID()
  console.info(`[upload] total for ${file.name}: ${elapsed(startedAt)}`)

  // Cloud reports are saved (encrypted) here; device reports go back to the
  // browser, which saves them locally.
  if (owner.storage === "cloud") {
    await saveCloudReport(owner.userId, id, report)
    return NextResponse.json({ id, storage: owner.storage })
  }
  return NextResponse.json({ id, storage: owner.storage, report })
}

function errorResponse(error: unknown) {
  if (error instanceof PdfPasswordError) {
    return NextResponse.json(
      { error: error.message, passwordRequired: error.reason },
      { status: 422 }
    )
  }
  console.error("PDF upload error", error)
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Failed to process PDF" },
    { status: 500 }
  )
}
