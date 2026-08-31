import { ChevronDown, Sparkles } from "lucide-react"

export default function Mockup() {
  return (
    <div className="relative min-h-[410px] overflow-hidden rounded-3xl border border-white/40 bg-card/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_24px_80px_rgba(46,134,222,0.14)] backdrop-blur-2xl sm:p-7">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/20 backdrop-blur-3xl" />
      <div className="pointer-events-none absolute top-8 -left-12 h-36 w-36 rounded-full bg-cyan-accent/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-8 h-32 w-32 rounded-full bg-gold-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute top-5 right-8 left-8 h-px bg-white/70" />
      <div className="absolute top-10 -right-8 hidden h-28 w-28 rounded-full border border-white/40 bg-white/20 shadow-inner backdrop-blur-xl lg:block" />
      <div className="relative rounded-2xl border border-border bg-card p-5 shadow-xl shadow-foreground/5 sm:p-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total balance</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              $24,680.40
            </p>
          </div>
          <span className="rounded-full bg-cyan-accent/12 px-2.5 py-1 text-xs font-medium text-cyan-accent">
            +12.8%
          </span>
        </div>
        <div className="mt-8 flex h-40 items-end gap-2 border-b border-border pb-0 sm:gap-4">
          {[42, 61, 52, 72, 64, 82, 94, 78, 100, 89, 106, 120].map(
            (height, i) => (
              <div key={i} className="flex flex-1 flex-col justify-end">
                <div
                  className={`rounded-t-md ${i > 8 ? "bg-cyan-accent shadow-[0_0_18px_color-mix(in_oklch,var(--cyan-accent),transparent_55%)]" : "bg-border"}`}
                  style={{ height: `${height}px` }}
                />
              </div>
            )
          )}
        </div>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <span>Jan</span>
          <span>Jun</span>
          <span>Dec</span>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="mt-1 font-medium">$8,420.00</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="mt-1 font-medium">$4,182.60</p>
          </div>
        </div>
      </div>
      <div className="relative -mt-5 ml-auto flex w-[82%] items-center gap-3 rounded-xl border border-cyan-accent/20 bg-card px-4 py-3 shadow-lg">
        <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-accent/15 text-cyan-accent">
          <Sparkles className="size-4" />
        </span>
        <div className="text-xs">
          <p className="font-medium">Your spending is on track</p>
          <p className="mt-0.5 text-muted-foreground">
            You&apos;re 18% below your monthly plan.
          </p>
        </div>
        <ChevronDown className="ml-auto size-4 text-muted-foreground" />
      </div>
    </div>
  )
}
