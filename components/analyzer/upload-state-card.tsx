import type { ReactNode } from "react"

type UploadStateCardProps = {
  fileName: string
  heading: string
  status: "uploading" | "success" | "error"
  error?: string
  /** Shown under an error, e.g. a link to upgrade. */
  action?: ReactNode
}

/** Progress for an upload. It sits inside the analyzer's card and its background. */
export function UploadStateCard({
  fileName,
  heading,
  status,
  error,
  action,
}: UploadStateCardProps) {
  const isLoading = status === "uploading"

  return (
    <div className="mx-auto max-w-xl">
      <div className="truncate text-sm text-white/80">
        {fileName || "Customer Statement.pdf"}
      </div>

      <h1 className="mt-6 min-h-[1.1em] font-serif text-4xl leading-[1.1] tracking-[-0.01em] text-balance sm:text-5xl">
        <span key={heading} className={isLoading ? "animate-upload-copy" : ""}>
          {heading}
        </span>
      </h1>

      <div
        className="mt-8 h-2 w-full overflow-hidden rounded-full bg-white/25"
        role="progressbar"
        aria-label={isLoading ? "Statement analysis in progress" : heading}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isLoading ? undefined : status === "success" ? 100 : 0}
      >
        <div
          className={`h-full rounded-full bg-white ${isLoading ? "animate-upload-progress w-2/5" : status === "success" ? "w-full" : "w-0"}`}
        />
      </div>

      {status === "error" && error ? (
        <div
          className="mt-8 rounded-xl bg-white px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {status === "error" && action ? (
        <div className="mt-4">{action}</div>
      ) : null}
    </div>
  )
}
