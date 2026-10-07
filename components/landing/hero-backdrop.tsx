import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, CircleCheck, Repeat } from "lucide-react"
import type { ReactNode } from "react"

// Illustrative sample figures for the marketing hero.
const naira = (value: number) => formatMoney(value, "NGN")

/*
 * Cards and connectors share one coordinate system: percentages of the
 * backdrop box. Each card's `drop` is the x where its connector falls to the
 * baseline, so lines always meet their card whatever the width.
 */
const BASELINE_Y = 94
const STATS: StatProps[] = [
  {
    label: "Money in",
    value: naira(2321537),
    note: "12% vs last month",
    trend: "up",
    position: { left: 4, top: 32 },
    drop: { x: 11.5, fromY: 46 },
  },
  {
    label: "Spent",
    value: naira(2443261),
    note: "5% vs last month",
    trend: "down",
    position: { left: 16, top: 64 },
    drop: { x: 23.5, fromY: 78 },
  },
  {
    label: "Balances verified",
    value: "179 rows",
    note: "Matches your bank",
    trend: "check",
    position: { left: 81, top: 32 },
    drop: { x: 88.5, fromY: 46 },
  },
  {
    label: "Recurring",
    value: `${naira(6545)}/mo`,
    note: "1 subscription found",
    trend: "repeat",
    position: { left: 69, top: 64 },
    drop: { x: 76.5, fromY: 78 },
  },
]

/** Grid, connectors and floating stat cards behind the hero copy. Decorative. */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="bg-hero-grid absolute inset-0" />
      <GridCells />

      <div className="absolute inset-x-0 top-0 mx-auto hidden h-[47rem] max-w-7xl lg:block">
        <Connectors />
        <Sparkle />
        <MiniLineCard className="top-[15%] left-[2%] -rotate-6" />
        <MiniBarCard className="top-[14%] right-[3%] rotate-6" />
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className="animate-float absolute w-[14%] min-w-44"
            style={{
              left: `${stat.position.left}%`,
              top: `${stat.position.top}%`,
              animationDelay: `${index * -1.6}s`,
            }}
          >
            <StatCard {...stat} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Two stat cards in a row, for screens too narrow for the full scene. */
export function HeroStatsCompact() {
  return (
    <div
      aria-hidden
      className="mt-12 grid grid-cols-2 gap-3 text-left lg:hidden"
    >
      <StatCard {...STATS[0]} />
      <StatCard {...STATS[2]} />
    </div>
  )
}

function Connectors() {
  const xs = STATS.map((stat) => stat.drop.x)
  const left = Math.min(...xs)
  const right = Math.max(...xs)

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full text-cyan-accent"
    >
      {STATS.map(({ label, drop }) => (
        <Line key={label} d={`M${drop.x} ${drop.fromY} V${BASELINE_Y}`} />
      ))}
      <Line d={`M${left} ${BASELINE_Y} H${right}`} />
    </svg>
  )
}

/** Four-point sparkle where the first connector meets the baseline. */
function Sparkle() {
  const x = Math.min(...STATS.map((stat) => stat.drop.x))
  return (
    <svg
      viewBox="-12 -12 24 24"
      className="absolute size-8 -translate-x-1/2 -translate-y-1/2 text-cyan-accent drop-shadow-[0_0_10px_var(--cyan-accent)]"
      style={{ left: `${x}%`, top: `${BASELINE_Y}%` }}
    >
      <path
        className="animate-twinkle"
        d="M0 -11 C1.2 -3 3 -1.2 11 0 C3 1.2 1.2 3 0 11 C-1.2 3 -3 1.2 -11 0 C-3 -1.2 -1.2 -3 0 -11Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** A faint line that draws in, with dashes flowing along it. */
function Line({ d }: { d: string }) {
  return (
    <>
      <path
        d={d}
        pathLength={1}
        className="animate-draw"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={d}
        pathLength={1}
        className="animate-flow"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </>
  )
}

/** A few tinted squares aligned to the 64px background grid. */
function GridCells() {
  const cells = [
    { col: -7, row: 3, delay: 0 },
    { col: 6, row: 2, delay: -1.5 },
    { col: -4, row: 9, delay: -3 },
    { col: 8, row: 8, delay: -2 },
    { col: 2, row: 10, delay: -4 },
  ]
  return (
    <>
      {cells.map(({ col, row, delay }) => (
        <span
          key={`${col}-${row}`}
          className="animate-cell-pulse absolute hidden size-16 bg-cyan-accent/[0.06] md:block"
          style={{
            // The background grid is centered, so lines sit at 50% − 32px + n·64px.
            left: `calc(50% - 32px + ${col * 64}px)`,
            top: `${row * 64}px`,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </>
  )
}

type StatProps = {
  label: string
  value: string
  note: string
  trend: "up" | "down" | "check" | "repeat"
  position: { left: number; top: number }
  drop: { x: number; fromY: number }
}

const TREND_ICONS: Record<StatProps["trend"], ReactNode> = {
  up: <ArrowUpRight className="size-3.5" />,
  down: <ArrowDownRight className="size-3.5" />,
  check: <CircleCheck className="size-3.5" />,
  repeat: <Repeat className="size-3.5" />,
}

function StatCard({ label, value, note, trend }: StatProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.3)] backdrop-blur">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-xl font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      <p
        className={cn(
          "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
          trend === "down"
            ? "bg-rose-50 text-rose-600"
            : "bg-cyan-accent/10 text-cyan-accent"
        )}
      >
        {TREND_ICONS[trend]}
        {note}
      </p>
    </div>
  )
}

function MiniLineCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute w-[13%] rounded-2xl border border-border/70 bg-card/90 p-3 opacity-80 shadow-sm",
        className
      )}
    >
      <p className="text-[0.625rem] text-muted-foreground">Daily balance</p>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="mt-2 h-12 w-full text-cyan-accent"
      >
        <path
          d="M0 30 C12 26 18 12 30 16 S48 34 60 24 S82 6 100 12 V40 H0 Z"
          fill="currentColor"
          fillOpacity="0.12"
        />
        <path
          d="M0 30 C12 26 18 12 30 16 S48 34 60 24 S82 6 100 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

function MiniBarCard({ className }: { className?: string }) {
  const bars = [40, 65, 30, 85, 55]
  return (
    <div
      className={cn(
        "absolute w-[11%] rounded-2xl border border-border/70 bg-card/90 p-3 opacity-80 shadow-sm",
        className
      )}
    >
      <p className="text-[0.625rem] text-muted-foreground">Report</p>
      <div className="mt-2 flex h-12 items-end gap-1.5">
        {bars.map((height, index) => (
          <span
            key={index}
            className={cn(
              "flex-1 rounded-sm",
              index === 3 ? "bg-cyan-accent" : "bg-cyan-accent/25"
            )}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  )
}
