import { Fragment, type ReactNode } from "react"

type UploadStateCardProps = {
  fileName: string
  heading: string
  status: "uploading" | "success" | "error"
  error?: string
  /** Shown under an error, e.g. a link to upgrade. */
  action?: ReactNode
  /** Parts of the statement read so far, once the server reports it. */
  progress?: { done: number; total: number }
}

// Each word of a new heading starts this much after the one before it.
const WORD_STAGGER_MS = 70

/** Progress for an upload. It sits inside the analyzer's card and its background. */
export function UploadStateCard({
  fileName,
  heading,
  status,
  error,
  action,
  progress,
}: UploadStateCardProps) {
  const isLoading = status === "uploading"
  const known = isLoading && progress !== undefined && progress.total > 0
  // Never empty or full while there's still work left after the last part.
  const percent = known
    ? Math.round(10 + (progress.done / progress.total) * 85)
    : undefined
  // A trailing "..." becomes the animated dots, apart from the words.
  const loadingDots = isLoading && heading.endsWith("...")
  const words = (loadingDots ? heading.slice(0, -3) : heading).split(" ")

  return (
    <div className="mx-auto max-w-xl">
      <div className="truncate text-sm text-white/80">
        {fileName || "Customer Statement.pdf"}
      </div>

      <h1 className="mt-6 min-h-[1.1em] font-serif text-4xl leading-[1.1] tracking-[-0.01em] text-balance sm:text-5xl">
        {words.map((word, index) => {
          // Keyed by the heading, so each new heading's words animate in.
          const animated = (
            <span
              key={`${heading}:${index}`}
              className={isLoading ? "animate-upload-copy" : undefined}
              style={
                isLoading
                  ? { animationDelay: `${index * WORD_STAGGER_MS}ms` }
                  : undefined
              }
            >
              {word}
            </span>
          )
          if (index < words.length - 1)
            return <Fragment key={`${heading}:${index}`}>{animated} </Fragment>
          // A stable key keeps the dots mounted, so their loop carries on
          // across headings; nowrap keeps them on the last word's line.
          return (
            <span key="last" className="whitespace-nowrap">
              {animated}
              {loadingDots ? <LoadingDots /> : null}
            </span>
          )
        })}
      </h1>

      <div
        className="mt-8 h-2 w-full overflow-hidden rounded-full bg-white/25"
        role="progressbar"
        aria-label={isLoading ? "Statement analysis in progress" : heading}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isLoading ? percent : status === "success" ? 100 : 0}
      >
        {known ? (
          <div
            className="relative h-full overflow-hidden rounded-full bg-white transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          >
            <div className="animate-upload-shimmer absolute inset-0 bg-linear-to-r from-transparent via-cyan-accent/25 to-transparent" />
          </div>
        ) : (
          <div
            className={`h-full rounded-full bg-white ${isLoading ? "animate-upload-progress w-2/5" : status === "success" ? "w-full" : "w-0"}`}
          />
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 flex items-center justify-between text-sm text-white/80 tabular-nums">
          <span>
            {known
              ? `${progress.done} of ${progress.total} parts read`
              : "Getting your statement ready"}
          </span>
          <span className="font-medium text-white">
            {known ? `${percent}%` : null}
          </span>
        </div>
      ) : null}

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

/** Three dots that rise in turn, on their own loop, while the words settle. */
function LoadingDots() {
  return (
    <span aria-hidden className="ml-0.5 inline-flex">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="animate-upload-dot inline-block"
          style={{ animationDelay: `${dot * 160}ms` }}
        >
          .
        </span>
      ))}
    </span>
  )
}
