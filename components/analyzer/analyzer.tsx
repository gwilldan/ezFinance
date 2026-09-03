"use client"

import { ChangeEvent, useRef, useState } from "react"
import { UploadStateCard } from "./upload-state-card"

export default function Analyzer() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [fileName, setFileName] = useState("Customer Statement.pdf")
  const [error, setError] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)

  async function handleFileUpload(file: File) {
    if (file.type !== "application/pdf") {
      setFileName(file.name || "Customer Statement.pdf")
      setUploadState("error")
      setError("Only PDF files are allowed.")
      setExtractedText(null)
      return
    }

    setFileName(file.name || "Customer Statement.pdf")
    setUploadState("uploading")
    setError(null)
    setExtractedText(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json().catch(() => ({}))) as { error?: string; text?: string }

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to upload your PDF.")
      }

      const nextText = data.text ?? "No text was returned for this PDF."
      setExtractedText(nextText)
      setUploadState("success")
    } catch (uploadError) {
      setExtractedText(null)
      setUploadState("error")
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.")
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
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

      {uploadState === "idle" ? (
        <div className="rounded-2xl bg-slate-100 p-12 text-center shadow-sm">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mx-auto rounded-xl bg-slate-900 px-10 py-4 text-white shadow-inner hover:opacity-95"
            aria-label="Analyze my statement"
            disabled={isUploading}
          >
            Analyze my statement
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <UploadStateCard
            fileName={fileName}
            status={uploadState === "success" ? "success" : uploadState === "error" ? "error" : "uploading"}
            heading={
              uploadState === "uploading"
                ? "Reading your statement..."
                : uploadState === "success"
                  ? "Statement ready"
                  : "Something went wrong"
            }
            error={error ?? undefined}
            resultText={extractedText ?? undefined}
          />
        </div>
      )}

      <div className="mt-8 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-100">
        <h3 className="text-sm font-medium text-slate-700">Statement tool</h3>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 3v18h18" />
                <path d="M7 16v-6" />
                <path d="M11 16v-2" />
                <path d="M15 16v-10" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Analyze statement</div>
              <div className="mt-1 text-sm text-muted-foreground">Categories, cash flow, subscriptions and a full report.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Upload PDF statement"
          >
            ▾
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-100">
        <h3 className="text-sm font-medium text-slate-700">History</h3>
        <div className="mt-4">
          <div className="mx-auto my-4 max-w-2xl rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            {extractedText ? "PDF analyzed successfully" : "Upload your first statement above"}
            <div className="mt-1 text-xs text-muted-foreground">Your analyses and tool runs will appear here.</div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium">Free analysis</div>
              <div className="text-sm text-slate-500">0 / 1</div>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 w-0 rounded-full bg-slate-300" />
            </div>
            <div className="mt-3 text-right text-sm text-slate-500">Unlock more reports</div>
          </div>
        </div>
      </div>
    </div>
  )
}
