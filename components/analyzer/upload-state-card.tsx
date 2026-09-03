type UploadStateCardProps = {
  fileName: string
  heading: string
  status: "uploading" | "success" | "error"
  error?: string
  resultText?: string
}

export function UploadStateCard({
  fileName,
  heading,
  status,
  error,
  resultText,
}: UploadStateCardProps) {
  const isLoading = status === "uploading"

  return (
    <>
      <div className="rounded-2xl bg-slate-100 p-12 text-center shadow-sm">
        <div className="mx-auto max-w-4xl">
          <div className="text-center font-light tracking-[-0.06em] text-[#4b5d72]">
            {fileName || "Customer Statement.pdf"}
          </div>

          <div className="mt-10 min-h-[1em] text-center text-[clamp(2.5rem,4vw,4rem)] leading-none font-medium tracking-[-0.07em] text-[#4b5d72]">
            <span
              key={heading}
              className={isLoading ? "animate-upload-copy" : ""}
            >
              {heading}
            </span>
          </div>

          <div
            className="mt-10 h-2 w-full overflow-hidden rounded-full bg-[#d3d6d9]"
            role="progressbar"
            aria-label={isLoading ? "Statement analysis in progress" : heading}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              isLoading ? undefined : status === "success" ? 100 : 0
            }
          >
            <div
              className={`h-full rounded-full bg-[#7b8795] ${isLoading ? "animate-upload-progress w-2/5" : status === "success" ? "w-full" : "w-0"}`}
            />
          </div>

          {status === "error" && error ? (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {status === "success" && resultText ? (
            <div className="mt-8 max-h-56 overflow-auto rounded-xl border border-[#dfe3e7] bg-white/60 p-4 text-left text-sm leading-6 whitespace-pre-wrap text-slate-700">
              {resultText}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
