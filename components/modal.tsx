import { Check, FileUp, X } from "lucide-react"
import { Button } from "./ui/button"

export default function Modal({
  setShowDemo,
}: {
  setShowDemo: (show: boolean) => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="ezFinance demo"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your financial co-pilot</h2>
          <button onClick={() => setShowDemo(false)} aria-label="Close demo">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Bring your bank statement or connect an account to get a clear v iew
          of your money in minutes.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            className="w-full rounded-full"
            onClick={() => setShowDemo(false)}
          >
            <FileUp className="size-4" /> Upload a statement
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={() => setShowDemo(false)}
          >
            Connect an account
          </Button>
        </div>
        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="size-3.5" /> Bank-level encryption
        </div>
      </div>
    </div>
  )
}
