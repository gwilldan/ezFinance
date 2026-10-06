import type { Category } from "@/lib/bank-statement/schema"
import { CATEGORY_COLORS } from "@/lib/category-colors"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CircleCheck, Sparkles } from "lucide-react"
import type { ReactNode } from "react"

// Illustrative sample data for the marketing mockups.
const naira = (value: number) => formatMoney(value, "NGN")

function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 text-foreground shadow-[0_18px_50px_-20px_rgba(15,23,42,0.25)]",
        className
      )}
    >
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

export function BalanceCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardLabel>Closing balance</CardLabel>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums">
            {naira(639741)}
          </p>
        </div>
        <span className="rounded-full bg-cyan-accent/10 px-2 py-1 text-xs font-medium whitespace-nowrap text-cyan-accent">
          Daily
        </span>
      </div>
      <svg
        viewBox="0 0 240 80"
        preserveAspectRatio="none"
        className="mt-4 h-20 w-full text-cyan-accent"
        aria-hidden
      >
        <defs>
          <linearGradient id="balance-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 62 C20 60 30 52 48 54 S80 64 96 48 S120 10 140 14 S170 44 188 40 S220 30 240 34 V80 H0 Z"
          fill="url(#balance-fill)"
        />
        <path
          d="M0 62 C20 60 30 52 48 54 S80 64 96 48 S120 10 140 14 S170 44 188 40 S220 30 240 34"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[0.6875rem] text-muted-foreground">
        <span>16 Apr</span>
        <span>30 Apr</span>
        <span>15 May</span>
      </div>
    </Card>
  )
}

const SPENDING: { category: Category; amount: number }[] = [
  { category: "Groceries", amount: 265440 },
  { category: "Transport", amount: 129120 },
  { category: "Dining Out", amount: 98300 },
  { category: "Utilities", amount: 61500 },
]
const TOP_SPEND = SPENDING[0].amount

export function CategoryCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardLabel>Where your money went</CardLabel>
      <ul className="mt-3 space-y-3">
        {SPENDING.map(({ category, amount }) => (
          <li key={category}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                />
                {category}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {naira(amount)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(amount / TOP_SPEND) * 100}%`,
                  backgroundColor: CATEGORY_COLORS[category],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function AssistantCard({ className }: { className?: string }) {
  return (
    <Card className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="grid size-6 place-items-center rounded-lg bg-cyan-accent/10 text-cyan-accent">
          <Sparkles className="size-3.5" />
        </span>
        Ask ezFinance
      </div>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3 py-2 text-xs text-ink-foreground">
        What did I spend the most on?
      </p>
      <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs leading-5 text-pretty">
        Groceries: {naira(265440)}, about 42% of your spending this statement.
      </p>
    </Card>
  )
}

export function VerifiedCard({ className }: { className?: string }) {
  return (
    <Card className={cn("flex items-center gap-3", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-accent/10 text-cyan-accent">
        <CircleCheck className="size-4.5" />
      </span>
      <div className="text-xs">
        <p className="font-medium">Balances verified</p>
        <p className="mt-0.5 text-muted-foreground tabular-nums">
          179 transactions · 12 pages
        </p>
      </div>
    </Card>
  )
}

const BUDGETS = [
  { label: "Food", used: 0.68, left: 32000 },
  { label: "Transport", used: 0.4, left: 54000 },
  { label: "Fun", used: 0.86, left: 7000 },
]

export function ExpenseCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardLabel>This month’s budgets</CardLabel>
      <ul className="mt-3 space-y-3">
        {BUDGETS.map(({ label, used, left }) => (
          <li key={label} className="text-xs">
            <div className="flex justify-between gap-3">
              <span>{label}</span>
              <span className="text-muted-foreground tabular-nums">
                {naira(left)} left
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-cyan-accent"
                style={{ width: `${used * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

const TAX_STEPS = [
  { label: "Income gathered from statements", done: true },
  { label: "Reliefs and deductions found", done: true },
  { label: "Return ready to review", done: false },
]

export function TaxCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardLabel>2026 tax return</CardLabel>
      <ul className="mt-3 space-y-2.5">
        {TAX_STEPS.map(({ label, done }) => (
          <li key={label} className="flex items-center gap-2.5 text-xs">
            <span
              className={cn(
                "grid size-4.5 shrink-0 place-items-center rounded-full border",
                done
                  ? "border-cyan-accent bg-cyan-accent text-white"
                  : "border-border"
              )}
            >
              {done ? <CircleCheck className="size-3" /> : null}
            </span>
            <span className={done ? "" : "text-muted-foreground"}>{label}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
