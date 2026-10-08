"use client"

import type { UsageSummary } from "@/lib/billing/types"
import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"

const RADIUS = 13
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * How much of the account's AI question allowance is used, as a ring.
 * Hover or click it for the details. The count is shared by every statement.
 * `refreshKey` changes after each answer so the ring stays current.
 */
export function ChatUsage({ refreshKey }: { refreshKey: number }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelId = useId()

  useEffect(() => {
    let cancelled = false
    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((data: UsageSummary | null) => {
        if (!cancelled && data) setUsage(data)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  useEffect(() => {
    if (!pinned) return
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPinned(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPinned(false)
    }
    document.addEventListener("mousedown", closeOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [pinned])

  if (!usage) {
    return (
      <div
        className="h-8 w-8 animate-pulse rounded-full bg-slate-100"
        aria-hidden
      />
    )
  }

  const meter = usage.agentCalls
  const fraction = usedFraction(meter)
  const percent = Math.round(fraction * 100)
  const tone =
    meter.remaining === 0
      ? "text-red-500"
      : fraction >= 0.8
        ? "text-amber-500"
        : "text-cyan-accent"
  const open = hovered || pinned

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => setPinned((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`AI questions: ${percent}% used`}
        className="relative grid h-8 w-8 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-cyan-accent/40 focus-visible:outline-none"
      >
        <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90" aria-hidden>
          <circle
            cx="16"
            cy="16"
            r={RADIUS}
            fill="none"
            strokeWidth="3"
            className="stroke-slate-100"
          />
          <circle
            cx="16"
            cy="16"
            r={RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            className={`${tone} transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none`}
          />
        </svg>
        <span className="absolute text-[9px] font-semibold text-slate-600 tabular-nums">
          {percent}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl bg-white p-4 text-left shadow-xl ring-1 ring-slate-100"
        >
          <p className="text-sm font-semibold text-slate-700">
            AI questions · {percent}% used
          </p>
          <dl className="mt-3 space-y-1.5 text-xs text-slate-500">
            <Row label="Used" value={`${meter.used} of ${meter.included}`} />
            {meter.credits ? (
              <Row label="Purchased credits" value={`${meter.credits}`} />
            ) : null}
            {meter.overage ? (
              <Row label="Extra this month" value={`${meter.overage}`} />
            ) : null}
            <Row
              label="Left"
              value={
                meter.remaining === null
                  ? "No limit, billed per use"
                  : `${meter.remaining}`
              }
            />
            <Row
              label={usage.periodEnd ? "Resets" : "Allowance"}
              value={
                usage.periodEnd
                  ? new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(usage.periodEnd))
                  : "Lifetime"
              }
            />
          </dl>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Shared across all your statements.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-block text-xs font-medium text-cyan-accent underline-offset-4 hover:underline"
          >
            {meter.remaining === 0 ? "Get more questions" : "See plans"}
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-medium text-slate-700 tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * Share of the allowance used. Purchased credits add to what's available;
 * with overage there's no cap, so it's measured against the plan allowance.
 */
function usedFraction(meter: UsageSummary["agentCalls"]) {
  if (meter.remaining === null) {
    return meter.included ? Math.min(meter.used / meter.included, 1) : 1
  }
  const available = meter.included + meter.credits
  if (!available) return 1
  return Math.min(Math.max((available - meter.remaining) / available, 0), 1)
}
