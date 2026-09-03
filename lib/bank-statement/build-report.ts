import {
  buildCategoryBreakdown,
  buildRunningBalance,
  buildSnapshot,
  computeHealthScore,
  detectPossibleDuplicates,
  detectSubscriptions,
} from "./analyze"
import { generateRecommendations } from "./recommend"
import type { StatementReport, Transaction } from "./schema"

export function buildReport(
  transactions: Transaction[],
  metadata: { fileName: string; pages: number; currency?: string }
): StatementReport {
  const snapshot = buildSnapshot(transactions)
  const categories = buildCategoryBreakdown(transactions)
  const subscriptions = detectSubscriptions(transactions)
  const duplicates = detectPossibleDuplicates(transactions)
  const runningBalance = buildRunningBalance(transactions)
  const subscriptionsMonthly = subscriptions.reduce(
    (total, subscription) => total + subscription.monthlyCost,
    0
  )
  const dates = transactions.map((transaction) => transaction.date).sort()
  const activeDays = new Set(
    transactions.map((transaction) => transaction.date)
  ).size

  return {
    fileName: metadata.fileName,
    pages: metadata.pages,
    currency: metadata.currency ?? "NGN",
    statementPeriod: formatPeriod(dates),
    generatedAt: new Date().toISOString(),
    activity: {
      transactionCount: transactions.length,
      averageTransaction: transactions.length
        ? (snapshot.totalIn + snapshot.totalOut) / transactions.length
        : 0,
      activeDays,
    },
    snapshot,
    categories,
    subscriptions,
    duplicates,
    runningBalance,
    healthScore: computeHealthScore(snapshot, subscriptionsMonthly),
    recommendations: generateRecommendations(
      snapshot,
      categories,
      subscriptions
    ),
    transactions,
  }
}

function formatPeriod(dates: string[]): string {
  if (!dates.length) return "Statement period unavailable"
  const first = formatMonth(dates[0])
  const last = formatMonth(dates[dates.length - 1])
  return first === last ? first : `${first} – ${last}`
}

function formatMonth(date: string): string {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(parsed)
}
