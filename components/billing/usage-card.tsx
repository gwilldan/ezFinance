import type { UsageMeter, UsageSummary } from "@/lib/billing/types"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

const PLAN_NAMES = { free: "Free", pro: "Pro", business: "Business" }

/** Plan, what's included and what's left. Used on the analyzer and settings. */
export function UsageCard({
  usage,
  className,
}: {
  usage: UsageSummary
  className?: string
}) {
  const resets = usage.periodEnd
    ? `Resets ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(usage.periodEnd))}`
    : "Lifetime allowance"

  return (
    <section
      aria-label="Plan and usage"
      className={cn("rounded-2xl border border-border bg-card p-5", className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{PLAN_NAMES[usage.plan]} plan</h3>
        <span className="text-xs text-muted-foreground">{resets}</span>
      </div>

      <div className="mt-4 space-y-4">
        <Meter label="Reports" meter={usage.reports} />
        <Meter label="AI assistant questions" meter={usage.agentCalls} />
      </div>

      <Link
        href="/pricing"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-accent underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:outline-none"
      >
        {usage.plan === "free" ? "Unlock more reports" : "See plans"}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}

function Meter({ label, meter }: { label: string; meter: UsageMeter }) {
  const used = Math.min(meter.used, meter.included)
  const percent = meter.included ? (used / meter.included) * 100 : 100
  const exhausted = meter.remaining === 0

  const extras = [
    meter.credits ? `+${meter.credits} purchased` : null,
    meter.overage ? `${meter.overage} extra this month` : null,
  ].filter(Boolean)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used} / {meter.included}
          {extras.length ? ` · ${extras.join(" · ")}` : ""}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} used`}
        aria-valuemin={0}
        aria-valuemax={meter.included}
        aria-valuenow={used}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            exhausted ? "bg-red-500" : "bg-cyan-accent"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {exhausted ? (
        <p className="mt-1.5 text-xs text-red-600">
          None left. Upgrade or buy a one-time report.
        </p>
      ) : null}
    </div>
  )
}
