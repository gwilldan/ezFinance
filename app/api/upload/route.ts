import { usageLimitResponse } from "@/lib/billing/paywall"
import { spendUsage } from "@/lib/billing/usage"
import { buildReport } from "@/lib/bank-statement/build-report"
import {
  elapsed,
  extractTransactions,
  type ExtractOptions,
} from "@/lib/bank-statement/extract"
import { PdfPasswordError, readPdfPages } from "@/lib/bank-statement/pdf"
import { saveCloudReport, saveLocalReportLocation } from "@/lib/reports/server"
import {
  reportStorageOf,
  UPLOAD_STREAM_TYPE,
  type ReportStorage,
  type UploadEvent,
} from "@/lib/reports/types"
import { getUserByAccessToken } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"

// A long statement takes minutes, more than some platforms allow by default.
export const maxDuration = 300

// Well under the idle timeouts of proxies and mobile networks.
const PING_EVERY_MS = 10_000

type Spend = NonNullable<Awaited<ReturnType<typeof spendUsage>>>
type Upload = {
  pages: string[]
  total: number
  fileName: string
  userId: string
  storage: ReportStorage
}

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

    // Reading the PDF is quick, so a locked or broken file still gets a
    // plain JSON answer; only the analysis is streamed.
    const startedAt = performance.now()
    const { pages, total } = await readPdfPages(
      new Uint8Array(await file.arrayBuffer()),
      typeof password === "string" && password ? password : undefined
    ).catch(async (error) => {
      await spend.refund()
      throw error
    })
    console.info(`[upload] parsed ${total} pages: ${elapsed(startedAt)}`)

    return streamAnalysis(
      {
        pages,
        total,
        fileName: file.name || "Bank statement.pdf",
        userId: user.id,
        storage: reportStorageOf(user.user_metadata),
      },
      spend,
      request.signal
    )
  } catch (error) {
    return errorResponse(error)
  }
}

/**
 * Streams progress while the statement is analyzed, pings in between, and the
 * report at the end. A device report is only worth finishing while the
 * browser is there to keep it, so if it leaves, the analysis stops and the
 * report is given back. A cloud report is finished and saved either way.
 */
function streamAnalysis(upload: Upload, spend: Spend, request: AbortSignal) {
  const left = new AbortController()
  request.addEventListener("abort", () => left.abort(), { once: true })
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: UploadEvent) => {
        if (left.signal.aborted) return
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        } catch {
          left.abort()
        }
      }
      const ping = setInterval(() => send({ type: "ping" }), PING_EVERY_MS)
      const startedAt = performance.now()

      try {
        const event = await analyze(upload, {
          onProgress: (done, total) => send({ type: "progress", done, total }),
          signal: upload.storage === "local" ? left.signal : undefined,
        })
        if (event.type === "error") await spend.refund()
        send(event)
      } catch (error) {
        // Only a finished report counts; anything else gives the report back.
        await spend.refund()
        if (upload.storage === "local" && left.signal.aborted) {
          console.info(
            `[upload] stopped ${upload.fileName} after ${elapsed(startedAt)}: the browser left`
          )
        } else {
          console.error("PDF upload error", error)
          send({ type: "error", error: messageOf(error) })
        }
      } finally {
        clearInterval(ping)
        try {
          controller.close()
        } catch {
          // Already closed when the browser cancelled the stream.
        }
      }
    },
    cancel() {
      left.abort()
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": UPLOAD_STREAM_TYPE,
      "cache-control": "no-store",
    },
  })
}

async function analyze(
  upload: Upload,
  options: ExtractOptions
): Promise<UploadEvent> {
  const startedAt = performance.now()
  const { transactions, currency } = await extractTransactions(
    upload.pages,
    options
  )

  if (transactions.length === 0) {
    return {
      type: "error",
      error:
        "We could not find transaction rows in this PDF. Try a text-based statement or an OCR-enabled workflow.",
    }
  }

  const report = buildReport(transactions, {
    fileName: upload.fileName,
    pages: upload.total,
    currency,
  })

  const id = randomUUID()
  console.info(`[upload] total for ${upload.fileName}: ${elapsed(startedAt)}`)

  // Cloud reports are saved (encrypted) here; device reports go back to the
  // browser, which saves them locally, and only their location is kept here.
  if (upload.storage === "cloud") {
    await saveCloudReport(upload.userId, id, report)
    return { type: "result", id, storage: upload.storage }
  }
  // A location for a report no browser received would list it in the
  // history with nothing to open.
  options.signal?.throwIfAborted()
  await saveLocalReportLocation(upload.userId, id, report)
  return { type: "result", id, storage: upload.storage, report }
}

function errorResponse(error: unknown) {
  if (error instanceof PdfPasswordError) {
    return NextResponse.json(
      { error: error.message, passwordRequired: error.reason },
      { status: 422 }
    )
  }
  console.error("PDF upload error", error)
  return NextResponse.json({ error: messageOf(error) }, { status: 500 })
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Failed to process PDF"
}
