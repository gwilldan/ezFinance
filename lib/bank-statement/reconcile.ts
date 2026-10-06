import { statementOrder } from "./analyze"
import type { Transaction } from "./schema"

export type ReconcileStats = {
  swapsFixed: number
  directionsFixed: number
  balancesFilled: number
  missingBalances: number
}

/**
 * The statement's running balance is the ground truth. Bank labels such as
 * "inward transfer" on a stamp-duty charge mislead the model, so:
 * 1. rows where the model swapped amount and balance are swapped back,
 * 2. each row's direction is taken from its balance change, and
 * 3. missing balances are filled only when the amounts add up exactly
 *    between two known balances.
 */
export function reconcileBalances(transactions: Transaction[]): {
  transactions: Transaction[]
  stats: ReconcileStats
} {
  const order = statementOrder(transactions)
  const rows = order.oldestFirst.map((row) => ({ ...row }))
  const stats = {
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
