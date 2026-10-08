"use client"

import { UsageCard } from "@/components/billing/usage-card"
import type { StatementReport } from "@/lib/bank-statement/schema"
import { USAGE_LIMIT_CODE, type UsageSummary } from "@/lib/billing/types"
import { spaceGrotesk } from "@/lib/fonts"
import { saveLocalReport, useLocalReportSummaries } from "@/lib/report-store"
import type { RecordedReport, ReportStorage } from "@/lib/reports/types"
import { ArrowRight, FileUp } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChangeEvent, useEffect, useRef, useState } from "react"
import { PasswordModal, type PasswordReason } from "./password-modal"
import { ReportHistory } from "./report-history"
import { UploadStateCard } from "./upload-state-card"

type UploadResponse = {
  id?: string
  storage?: ReportStorage
  /** Only for device storage; cloud reports stay on the server. */
  report?: StatementReport
  error?: string
  code?: string
  passwordRequired?: PasswordReason
}

const LOADING_STAGES = [
  "Uploading your account statement...",
  "Reading your statement pages...",
  "Analyzing your transactions...",
  "Categorizing your spending...",
  "Plotting your financial plan...",
]

const LOADING_STAGE_INTERVAL = 8_000

export default function Analyzer({
  userId,
  usage,
  history,
}: {
  userId: string
  usage: UsageSummary
  history: RecordedReport[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle")
  const [fileName, setFileName] = useState("Customer Statement.pdf")
  const [error, setError] = useState<string | null>(null)
  const [loadingStage, setLoadingStage] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  // A protected file waiting for its password. The password itself is never
  // kept here; it only lives in the modal and the one request that uses it.
  const [locked, setLocked] = useState<{
    file: File
    reason: PasswordReason
  } | null>(null)

  useEffect(() => {
    if (uploadState !== "uploading") return

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      setLoadingStage(
        Math.min(
          LOADING_STAGES.length - 1,
          Math.floor(elapsed / LOADING_STAGE_INTERVAL)
        )
      )
    }, 1_000)

    return () => window.clearInterval(timer)
  }, [uploadState])

  async function handleFileUpload(file: File, password?: string) {
    if (file.type !== "application/pdf") {
      setFileName(file.name || "Customer Statement.pdf")
      setUploadState("error")
      setError("Only PDF files are allowed.")
      return
    }

    setFileName(file.name || "Customer Statement.pdf")
    setUploadState("uploading")
    setError(null)
    setLimitReached(false)
    setLoadingStage(0)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (password) formData.append("password", password)

      const data = await uploadStatement(formData)

      if (data.passwordRequired) {
        setLocked({ file, reason: data.passwordRequired })
        setUploadState("idle")
        return
      }

      if (data.code === USAGE_LIMIT_CODE) {
        setLimitReached(true)
        throw new Error(data.error)
      }

      if (!data.id || (data.storage !== "cloud" && !data.report))
        throw new Error(data.error ?? "The analysis response was incomplete.")

      if (data.storage !== "cloud" && data.report) {
        saveLocalReport(userId, {
          id: data.id,
          report: data.report,
          messages: [],
        })
      }
      setUploadState("success")
      router.push(`/result/${data.id}`)
    } catch (uploadError) {
      setUploadState("error")
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed."
      )
    } finally {
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const localHistory = useLocalReportSummaries(userId)

  function chooseAnotherFile() {
    setLocked(null)
    inputRef.current?.click()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    void handleFileUpload(file)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 pt-30">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {locked ? (
        <PasswordModal
          fileName={locked.file.name}
          reason={locked.reason}
          onSubmit={(password) => {
            const { file } = locked
            setLocked(null)
            void handleFileUpload(file, password)
          }}
          onChooseAnother={chooseAnotherFile}
          onClose={() => setLocked(null)}
        />
      ) : null}

      {/* One card for every state, so the background never changes. */}
      <div className="bg-dot-grid rounded-[2rem] bg-cyan-accent px-8 py-14 text-center text-cyan-accent-foreground shadow-sm sm:py-16">
        {uploadState === "idle" ? (
          <>
            <h1
              className={`${spaceGrotesk.className} text-4xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl`}
            >
              Analyze a statement
            </h1>
            <p className="mx-auto mt-3 max-w-md text-pretty text-white">
              Upload a PDF bank statement and get your report in about twenty
              seconds.
            </p>
            <UploadButton onClick={() => inputRef.current?.click()}>
              Analyze my statement
            </UploadButton>
          </>
        ) : (
          <UploadStateCard
            fileName={fileName}
            status={
              uploadState === "success"
                ? "success"
                : uploadState === "error"
                  ? "error"
                  : "uploading"
            }
            heading={
              uploadState === "uploading"
                ? LOADING_STAGES[loadingStage]
                : uploadState === "success"
                  ? "Statement ready"
                  : "Something went wrong"
            }
            error={error ?? undefined}
            action={
              limitReached ? (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-ink-foreground hover:bg-ink/85"
                >
                  See plans <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <UploadButton onClick={() => inputRef.current?.click()}>
                  Try another statement
                </UploadButton>
              )
            }
          />
        )}
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-100">
        <h3 className="text-sm font-medium text-slate-700">Statement tool</h3>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <svg
                className="h-5 w-5 text-emerald-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 3v18h18" />
                <path d="M7 16v-6" />
                <path d="M11 16v-2" />
                <path d="M15 16v-10" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Analyze statement</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Categories, cash flow, subscriptions and a full report.
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="cursor-not-allowed text-slate-300"
            aria-label="Statement tool options (coming soon)"
          >
            ▾
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-100">
        <h3 className="text-sm font-medium text-slate-700">History</h3>
        <div className="mt-4">
          <ReportHistory recorded={history} onDevice={localHistory} />

          <UsageCard usage={usage} />
        </div>
      </div>
    </div>
  )
}

function UploadButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-ink shadow-lg transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-accent focus-visible:outline-none"
    >
      <FileUp className="size-4" aria-hidden />
      {children}
    </button>
  )
}

function uploadStatement(formData: FormData): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("POST", "/api/upload")
    request.responseType = "json"
    request.timeout = 500_000

    request.addEventListener("load", () => {
      const data = (request.response ?? {}) as UploadResponse
      if (
        (request.status >= 200 && request.status < 300) ||
        data.passwordRequired ||
        data.code === USAGE_LIMIT_CODE
      ) {
        resolve(data)
      } else {
        reject(new Error(data.error ?? "Unable to upload your PDF."))
      }
    })
    request.addEventListener("error", () =>
      reject(new Error("The upload connection failed."))
    )
    request.addEventListener("timeout", () =>
      reject(new Error("The analysis took too long. Please try a smaller PDF."))
    )
    request.send(formData)
  })
}
