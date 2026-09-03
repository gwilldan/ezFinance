import type {
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
  const totalIn = sum(income)
  const totalOut = sum(expenses)
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

export function detectSubscriptions(
  transactions: Transaction[]
): Subscription[] {
  const byMerchant = new Map<string, Transaction[]>()
  for (const transaction of transactions.filter(
    (item) => item.type === "debit"
  )) {
    byMerchant.set(transaction.merchant, [
      ...(byMerchant.get(transaction.merchant) ?? []),
      transaction,
    ])
  }

  return [...byMerchant.entries()]
    .filter(
      ([, items]) =>
        items[0].category === "Subscriptions" ||
        (items.length > 1 && items[0].category === "Entertainment")
    )
    .map(([merchant, items]) => ({
      merchant,
      monthlyCost:
        items.reduce((total, item) => total + item.amount, 0) /
        Math.max(1, items.length),
      category: items[0].category,
      occurrences: items.length,
    }))
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
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
      const firstDate = Date.parse(first.date)
      const secondDate = Date.parse(second.date)
      const dayDiff =
        Number.isFinite(firstDate) && Number.isFinite(secondDate)
          ? Math.abs(firstDate - secondDate) / 86_400_000
          : Infinity

      if (
        first.merchant === second.merchant &&
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
  let runningBalance = 0
  return [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((transaction) => {
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

function sum(transactions: Transaction[]): number {
  return transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  )
}
