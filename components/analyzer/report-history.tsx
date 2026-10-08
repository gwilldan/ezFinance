"use client"

import { formatDate } from "@/lib/format"
import type { RecordedReport, ReportSummary } from "@/lib/reports/types"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Cloud,
  HardDrive,
  Laptop,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

const PAGE_SIZE = 5

/**
 * Where a report can be opened from here: the cloud, this device, or only
 * the other device that saved it.
 */
type HistoryEntry =
  | {
      id: string
      generatedAt: string
      place: "cloud" | "device"
      summary: ReportSummary
    }
  | { id: string; generatedAt: string; place: "elsewhere" }

/**
 * Every report the account has made, whichever device made it, newest first.
 * Device reports saved here open from here; ones saved on another device are
 * listed so nothing seems missing, but can only be opened there.
 */
export function ReportHistory({
  recorded,
  onDevice,
}: {
  /** Every report the server knows about. */
  recorded: RecordedReport[]
  /** Reports saved in this browser. */
  onDevice: ReportSummary[]
}) {
  const entries = useMemo(
    () => mergeHistory(recorded, onDevice),
    [recorded, onDevice]
  )
  const [page, setPage] = useState(0)
  const pages = Math.max(Math.ceil(entries.length / PAGE_SIZE), 1)
  // Stays in range when the list shrinks, e.g. after clearing saved reports.
  const current = Math.min(page, pages - 1)
  const visible = entries.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  if (!entries.length) {
    return (
      <div className="mx-auto my-4 max-w-2xl rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
        Upload your first statement above
        <div className="mt-1 text-xs text-muted-foreground">
          Your analyses and tool runs will appear here.
        </div>
      </div>
    )
  }

  return (
    <div className="my-4">
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {visible.map((entry) => (
          <li key={entry.id}>
            {entry.place === "elsewhere" ? (
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-500">
                    Saved on another device
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Analyzed {formatDate(entry.generatedAt)} · Open it on the
                    device that saved it
                  </p>
                </div>
                <StorageLabel place="elsewhere" />
                {/* Keeps labels aligned with the rows that open. */}
                <span className="size-4 shrink-0" aria-hidden />
              </div>
            ) : (
              <Link
                href={`/result/${entry.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">
                    {entry.summary.fileName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {entry.summary.statementPeriod} ·{" "}
                    {entry.summary.transactionCount} transaction
                    {entry.summary.transactionCount === 1 ? "" : "s"} · Analyzed{" "}
                    {formatDate(entry.generatedAt)}
                  </p>
                </div>
                <StorageLabel place={entry.place} />
                <ChevronRight
                  className="size-4 shrink-0 text-slate-300"
                  aria-hidden
                />
              </Link>
            )}
          </li>
        ))}
      </ul>

      {pages > 1 ? (
        <nav
          aria-label="History pages"
          className="mt-3 flex items-center justify-between text-sm text-slate-500"
        >
          <PageButton
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
          >
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </PageButton>
          <span className="tabular-nums" aria-live="polite">
            Page {current + 1} of {pages}
          </span>
          <PageButton
            onClick={() => setPage(current + 1)}
            disabled={current === pages - 1}
          >
            Next <ChevronRight className="size-4" aria-hidden />
          </PageButton>
        </nav>
      ) : null}
    </div>
  )
}

/** Matches the server's records with this device's reports. */
function mergeHistory(
  recorded: RecordedReport[],
  onDevice: ReportSummary[]
): HistoryEntry[] {
  const local = new Map(onDevice.map((summary) => [summary.id, summary]))
  const entries: HistoryEntry[] = recorded.map((report) => {
    if (report.storage === "cloud") {
      return { ...report, place: "cloud" }
    }
    const summary = local.get(report.id)
    return summary
      ? {
          id: report.id,
          generatedAt: report.generatedAt,
          place: "device",
          summary,
        }
      : { id: report.id, generatedAt: report.generatedAt, place: "elsewhere" }
  })

  // Device reports saved before the server kept a record of them.
  const known = new Set(recorded.map(({ id }) => id))
  for (const summary of onDevice) {
    if (!known.has(summary.id)) {
      entries.push({
        id: summary.id,
        generatedAt: summary.generatedAt,
        place: "device",
        summary,
      })
    }
  }

  return entries.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
}

function StorageLabel({ place }: { place: HistoryEntry["place"] }) {
  const { icon: Icon, label } = {
    cloud: { icon: Cloud, label: "Cloud" },
    device: { icon: Laptop, label: "This device" },
    elsewhere: { icon: HardDrive, label: "Local" },
  }[place]

  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-slate-400">
      <Icon className="size-3.5" aria-hidden /> {label}
    </span>
  )
}

function PageButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-40"
      )}
    >
      {children}
    </button>
  )
}
