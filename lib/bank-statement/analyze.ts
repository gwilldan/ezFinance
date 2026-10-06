import type {
  Cadence,
  CategoryBreakdown,
  DuplicatePair,
  HealthScore,
  RunningBalancePoint,
  Snapshot,
  Subscription,
  Transaction,
} from "./schema"

export function buildSnapshot(transactions: Transaction[]): Snapshot {
  const expenses = transactions.filter(
    (transaction) => transaction.type === "debit"
  )
  const income = transactions.filter(
    (transaction) => transaction.type === "credit"
  )
  const totalIn = sumAmounts(income)
  const totalOut = sumAmounts(expenses)
  const largestExpense = expenses.reduce<Transaction | undefined>(
    (largest, transaction) =>
      !largest || transaction.amount > largest.amount ? transaction : largest,
    undefined
  )

  return {
    netSaved: totalIn - totalOut,
    totalIn,
    totalOut,
    expenseCount: expenses.length,
    avgExpense: expenses.length ? totalOut / expenses.length : 0,
    largestExpense,
    savingsRate: totalIn ? (totalIn - totalOut) / totalIn : 0,
  }
}

export function buildCategoryBreakdown(
  transactions: Transaction[]
): CategoryBreakdown[] {
  const totals = new Map<Transaction["category"], number>()
  for (const transaction of transactions.filter(
    (item) => item.type === "debit"
  )) {
    totals.set(
      transaction.category,
      (totals.get(transaction.category) ?? 0) + transaction.amount
    )
  }

  const grandTotal = [...totals.values()].reduce(
    (total, value) => total + value,
    0
  )
  return [...totals.entries()]
    .map(([category, total]) => ({
      category,
      total,
      pct: grandTotal ? total / grandTotal : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

const DAY_MS = 86_400_000
const DAYS_PER_MONTH = 30.44
const CADENCES: { cadence: Cadence; days: number; min: number; max: number }[] =
  [
    { cadence: "weekly", days: 7, min: 5, max: 9 },
    { cadence: "biweekly", days: 14, min: 12, max: 17 },
    { cadence: "monthly", days: DAYS_PER_MONTH, min: 25, max: 35 },
    { cadence: "quarterly", days: 91.3, min: 80, max: 100 },
    { cadence: "yearly", days: 365, min: 350, max: 380 },
  ]
const MONTHLY = CADENCES[2]

/**
 * A merchant is recurring when its debits repeat on a steady cadence at a
 * steady amount. Charges the model tagged "Subscriptions" that only appear
 * within a single month are assumed monthly, since a one-month statement
 * can only show them once.
 */
export function detectSubscriptions(
  transactions: Transaction[]
): Subscription[] {
  const byMerchant = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    const key = merchantKey(transaction.merchant)
    if (transaction.type !== "debit" || !key) continue
    byMerchant.set(key, [...(byMerchant.get(key) ?? []), transaction])
  }

  return [...byMerchant.values()]
    .flatMap((items): Subscription[] => {
      const charges = items
        .filter((item) => Number.isFinite(toTime(item.date)))
        .sort((a, b) => toTime(a.date) - toTime(b.date))
      if (!charges.length) return []

      const amount = median(charges.map((item) => item.amount))
      if (!hasSteadyAmount(charges, amount)) return []

      const last = charges[charges.length - 1]
      const spanDays = (toTime(last.date) - toTime(charges[0].date)) / DAY_MS
      const cadence = charges.length > 1 ? detectCadence(charges) : undefined
      const taggedWithinMonth =
        !cadence &&
        spanDays < MONTHLY.min &&
        charges.every((item) => item.category === "Subscriptions")
      if (!cadence && !taggedWithinMonth) return []

      return [
        {
          merchant: last.merchant,
          category: last.category,
          cadence: (cadence ?? MONTHLY).cadence,
          amount,
          monthlyCost: cadence
            ? (amount * DAYS_PER_MONTH) / cadence.days
            : sumAmounts(charges),
          occurrences: charges.length,
          lastDate: last.date,
        },
      ]
    })
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
}

function detectCadence(charges: Transaction[]) {
  const gaps = charges
    .slice(1)
    .map(
      (item, index) =>
        (toTime(item.date) - toTime(charges[index].date)) / DAY_MS
    )
  const typicalGap = median(gaps)
  const cadence = CADENCES.find(
    ({ min, max }) => typicalGap >= min && typicalGap <= max
  )
  if (!cadence) return undefined

  const onSchedule = gaps.filter(
    (gap) => gap >= cadence.min && gap <= cadence.max
  ).length
  return onSchedule / gaps.length >= 0.75 ? cadence : undefined
}

/** At least 75% of charges within 25% of the typical amount. */
function hasSteadyAmount(charges: Transaction[], typical: number) {
  const steady = charges.filter(
    (item) => Math.abs(item.amount - typical) <= typical * 0.25
  ).length
  return steady / charges.length >= 0.75
}

export function detectPossibleDuplicates(
  transactions: Transaction[],
  windowDays = 2
): DuplicatePair[] {
  const debits = transactions.filter((item) => item.type === "debit")
  const duplicates: DuplicatePair[] = []

  for (let i = 0; i < debits.length; i += 1) {
    for (let j = i + 1; j < debits.length; j += 1) {
      const first = debits[i]
      const second = debits[j]
      const dayDiff =
        Math.abs(toTime(first.date) - toTime(second.date)) / DAY_MS

      if (
        merchantKey(first.merchant) === merchantKey(second.merchant) &&
        first.amount === second.amount &&
        dayDiff <= windowDays
      ) {
        duplicates.push({ first, second })
      }
    }
  }
  return duplicates
}

export function buildRunningBalance(
  transactions: Transaction[]
): RunningBalancePoint[] {
  // Same-day order is only known from the statement, so put it oldest-first
  // before the (stable) date sort.
  const chronological = statementOrder(transactions).oldestFirst.sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  let runningBalance = 0
  return chronological.map((transaction) => {
    runningBalance =
      transaction.balance ??
      runningBalance +
        (transaction.type === "credit"
          ? transaction.amount
          : -transaction.amount)
    return {
      date: transaction.date,
      balance: runningBalance,
      description: transaction.description,
    }
  })
}

/**
 * Statements list rows oldest- or newest-first, and same-day order is only
 * known from the statement, so flip rather than sort. `restore` puts rows
 * back in the statement's own order.
 */
export function statementOrder(transactions: Transaction[]) {
  const newestFirst =
    transactions.length > 1 &&
    transactions[0].date > transactions[transactions.length - 1].date
  return {
    oldestFirst: newestFirst ? [...transactions].reverse() : [...transactions],
    restore: (rows: Transaction[]) =>
      newestFirst ? [...rows].reverse() : rows,
  }
}

export type BalancePeriod = "daily" | "weekly" | "monthly"

/** Closing balance per day, week (starting Monday) or month, oldest first. */
export function balanceByPeriod(
  points: RunningBalancePoint[],
  period: BalancePeriod
): { period: string; balance: number }[] {
  const closing = new Map<string, number>()
  for (const point of points) {
    closing.set(periodKey(point.date, period), point.balance)
  }
  return [...closing].map(([key, balance]) => ({ period: key, balance }))
}

function periodKey(date: string, period: BalancePeriod): string {
  const day = date.slice(0, 10)
  if (period === "daily") return day
  if (period === "monthly") return day.slice(0, 7)

  const time = toTime(day)
  if (!Number.isFinite(time)) return day
  const weekday = (new Date(time).getUTCDay() + 6) % 7
  return new Date(time - weekday * DAY_MS).toISOString().slice(0, 10)
}

export function computeHealthScore(
  snapshot: Snapshot,
  subscriptionsMonthly: number
): HealthScore {
  let score = 50
  score += Math.min(Math.max(snapshot.savingsRate, 0) * 100, 30)
  score -= subscriptionsMonthly > snapshot.totalIn * 0.05 ? 10 : 0
  score -= snapshot.netSaved < 0 ? 20 : 0
  score = Math.max(0, Math.min(100, Math.round(score)))

  const label =
    score >= 75
      ? "Excellent"
      : score >= 50
        ? "Good"
        : score >= 25
          ? "Needs attention"
          : "At risk"
  return { score, label }
}

function sumAmounts(transactions: Transaction[]): number {
  return transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  )
}

function merchantKey(merchant: string): string {
  return merchant.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function toTime(date: string): number {
  return Date.parse(`${date.slice(0, 10)}T00:00:00Z`)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}
