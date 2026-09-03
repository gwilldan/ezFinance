type UploadStateCardProps = {
  fileName: string
  heading: string
  status: "uploading" | "success" | "error"
  error?: string
  resultText?: string
}

export function UploadStateCard({ fileName, heading, status, error, resultText }: UploadStateCardProps) {
  const isLoading = status === "uploading"

  return (
    <>
      <div className="rounded-2xl bg-slate-100 p-12 text-center shadow-sm">
        <div className="mx-auto max-w-4xl">
          <div className="text-center font-light tracking-[-0.06em] text-[#4b5d72]">
            {fileName || "Customer Statement.pdf"}
          </div>

          <div className="mt-10 text-center text-[clamp(2.5rem,4vw,4rem)] font-medium leading-none tracking-[-0.07em] text-[#4b5d72]">
            {heading}
          </div>

          <div className="mt-10 h-1.5 w-full overflow-hidden rounded-full bg-[#d3d6d9]">
            <div
              className={`h-full rounded-full bg-[#7b8795] ${isLoading ? "loading-bar" : "w-full"}`}
              style={
                isLoading
                  ? {
                      width: "32%",
                    }
                  : {
                      width: "100%",
                    }
              }
            />
          </div>

          {status === "error" && error ? (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {status === "success" && resultText ? (
            <div className="mt-8 max-h-56 overflow-auto rounded-xl border border-[#dfe3e7] bg-white/60 p-4 text-left text-sm leading-6 text-slate-700 whitespace-pre-wrap">
              {resultText}
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .loading-bar {
          animation: loadingBar 1.6s ease-in-out infinite;
          transform-origin: left center;
        }

        @keyframes loadingBar {
          0% {
            transform: translateX(-12%) scaleX(0.45);
            opacity: 0.5;
          }
          50% {
            transform: translateX(63%) scaleX(1);
            opacity: 1;
          }
          100% {
            transform: translateX(145%) scaleX(0.5);
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  )
}
