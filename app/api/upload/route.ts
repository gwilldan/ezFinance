import { getUserByAccessToken } from "@/lib/supabase/server"
import { buildReport } from "@/lib/bank-statement/build-report"
import { elapsed, extractTransactions } from "@/lib/bank-statement/extract"
import { PdfPasswordError, readPdfPages } from "@/lib/bank-statement/pdf"
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

    const startedAt = performance.now()
    const { pages, total } = await readPdfPages(
      new Uint8Array(await file.arrayBuffer()),
      typeof password === "string" && password ? password : undefined
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

    console.info(`[upload] total for ${file.name}: ${elapsed(startedAt)}`)
    return NextResponse.json({ report })
  } catch (error) {
    if (error instanceof PdfPasswordError) {
      return NextResponse.json(
        { error: error.message, passwordRequired: error.reason },
        { status: 422 }
      )
    }
    console.error("PDF upload error", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process PDF",
      },
      { status: 500 }
    )
  }
}
