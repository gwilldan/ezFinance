import { statementOrder } from "./analyze"
import type { Transaction } from "./schema"

const MONTH_DAYS = 31

export type ReconcileStats = {
  datesFixed: number
  swapsFixed: number
  directionsFixed: number
  balancesFilled: number
  missingBalances: number
}

/**
 * The statement's running balance is the ground truth. Bank labels such as
 * "inward transfer" on a stamp-duty charge mislead the model, so:
 * 0. dates misread as MM/DD (an outlier among its neighbours) are fixed,
 * 1. rows where the model swapped amount and balance are swapped back,
 * 2. each row's direction is taken from its balance change, and
 * 3. missing balances are filled only when the amounts add up exactly
 *    between two known balances.
 */
export function reconcileBalances(transactions: Transaction[]): {
  transactions: Transaction[]
  stats: ReconcileStats
} {
  // Dates first: one misread date at either end would flip the detected order.
  const dated = transactions.map((row) => ({ ...row }))
  const datesFixed = fixDates(dated)
  const order = statementOrder(dated)
  const rows = order.oldestFirst
  const stats = {
    datesFixed,
    swapsFixed: fixSwaps(rows),
    directionsFixed: 0,
    balancesFilled: 0,
    missingBalances: 0,
  }

  stats.directionsFixed += fixDirections(rows)

  for (let start = 0; start < rows.length; start += 1) {
    if (rows[start].balance !== undefined) continue
    let end = start
    while (end < rows.length && rows[end].balance === undefined) end += 1

    const before = rows[start - 1]?.balance
    const after = rows[end]
    if (before !== undefined && after) {
      const filled = fillGap(rows.slice(start, end), before, after)
      filled?.forEach((row, offset) => {
        if (row.type !== rows[start + offset].type) stats.directionsFixed += 1
        rows[start + offset] = row
      })
      stats.balancesFilled += filled?.length ?? 0
    }
    start = end
  }

  // Rows right after a filled gap can only be checked now.
  stats.directionsFixed += fixDirections(rows)
  stats.missingBalances = rows.filter((row) => row.balance === undefined).length
  return { transactions: order.restore(rows), stats }
}

/**
 * A row whose date sits outside its neighbours but fits once day and month
 * are swapped was a DD/MM date read as MM/DD (or the reverse). Decisions use
 * the original dates so one bad row can't cascade into its neighbours.
 */
function fixDates(rows: Transaction[]): number {
  const dates = rows.map((row) => row.date)
  let fixed = 0
  dates.forEach((date, index) => {
    const swapped = swapDayMonth(date)
    const range = expectedRange(dates, index)
    if (swapped && range && !within(date, range) && within(swapped, range)) {
      rows[index] = { ...rows[index], date: swapped }
      fixed += 1
    }
  })
  return fixed
}

/**
 * Between its two neighbours; at either end, within a month of the next two
 * rows, and only when those two agree with each other.
 */
function expectedRange(dates: string[], index: number) {
  const previous = dates[index - 1]
  const next = dates[index + 1]
  if (previous && next) return [previous, next].sort()

  const [a, b] = previous
    ? [previous, dates[index - 2]]
    : [next, dates[index + 2]]
  // `!(gap <= …)` also rejects unparseable dates (NaN).
  const gap = a && b ? Math.abs(toDay(a) - toDay(b)) : Number.NaN
  if (!(gap <= MONTH_DAYS)) return undefined
  const [low, high] = [a, b].sort()
  return [shiftDays(low, -MONTH_DAYS), shiftDays(high, MONTH_DAYS)]
}

function within(date: string, [low, high]: string[]) {
  return date >= low && date <= high
}

function toDay(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000
}

function shiftDays(date: string, days: number) {
  return new Date((toDay(date) + days) * 86_400_000).toISOString().slice(0, 10)
}

function swapDayMonth(date: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match || Number(match[3]) > 12) return undefined
  return `${match[1]}-${match[3]}-${match[2]}`
}

/** Swaps amount and balance back when only the swapped values chain. */
function fixSwaps(rows: Transaction[]): number {
  let fixed = 0
  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    const { amount, balance } = rows[i]
    const next = rows[i + 1]
    if (previous === undefined || balance === undefined) continue

    const chains = (rowAmount: number, rowBalance: number) =>
      sameAmount(Math.abs(rowBalance - previous), rowAmount) &&
      (next?.balance === undefined ||
        sameAmount(Math.abs(next.balance - rowBalance), next.amount))

    if (!chains(amount, balance) && chains(balance, amount)) {
      rows[i] = { ...rows[i], amount: balance, balance: amount }
      fixed += 1
    }
  }
  return fixed
}

/** Sets each row's direction from its balance change; returns rows changed. */
function fixDirections(rows: Transaction[]): number {
  let fixed = 0
  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    const row = rows[i]
    if (previous === undefined || row.balance === undefined) continue

    const delta = row.balance - previous
    if (!sameAmount(Math.abs(delta), row.amount)) continue

    const type = delta > 0 ? "credit" : "debit"
    if (row.type !== type) {
      rows[i] = withType(row, type)
      fixed += 1
    }
  }
  return fixed
}

/**
 * Balances for rows between two known balances, if their amounts add up.
 * Also tries flipping one row's direction, which catches a single misread
 * refund or fee inside the gap.
 */
function fillGap(
  gap: Transaction[],
  before: number,
  after: Transaction
): Transaction[] | undefined {
  const candidates = [
    gap,
    ...gap.map((row, index) =>
      gap.map((item, i) =>
        i === index
          ? withType(row, row.type === "credit" ? "debit" : "credit")
          : item
      )
    ),
  ]

  for (const candidate of candidates) {
    let running = before
    const filled = candidate.map((row) => {
      running += signed(row)
      return { ...row, balance: round(running) }
    })
    if (sameAmount(running + signed(after), after.balance!)) return filled
  }
  return undefined
}

function withType(row: Transaction, type: Transaction["type"]): Transaction {
  // Income only makes sense on money in.
  const category =
    type === "debit" && row.category === "Income" ? "Other" : row.category
  return { ...row, type, category }
}

function signed(row: Transaction) {
  return row.type === "credit" ? row.amount : -row.amount
}

function sameAmount(a: number, b: number) {
  return Math.abs(a - b) < 0.005
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
