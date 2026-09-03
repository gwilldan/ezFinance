import type {
  CategoryBreakdown,
  Recommendation,
  Snapshot,
  Subscription,
} from "./schema"

export function generateRecommendations(
  snapshot: Snapshot,
  categories: CategoryBreakdown[],
  subscriptions: Subscription[]
): Recommendation[] {
  const recommendations: Recommendation[] = []
  const dining = categories.find((item) => item.category === "Dining Out")
  const shopping = categories.find((item) => item.category === "Shopping")
  const subscriptionTotal = subscriptions.reduce(
    (total, item) => total + item.monthlyCost,
    0
  )

  if (subscriptionTotal > 0) {
    recommendations.push({
      impact: subscriptionTotal,
      title: "Review recurring subscriptions",
      explanation: `${subscriptions.length} recurring service${subscriptions.length === 1 ? "" : "s"} account for about ${formatAmount(subscriptionTotal)} per month. Cancel anything you no longer use.`,
    })
  }
  if (dining && dining.total > 0) {
    recommendations.push({
      impact: Math.round(dining.total * 0.2),
      title: "Trim dining out by 20%",
      explanation: `Dining out is ${Math.round(dining.pct * 100)}% of your spending. Reducing it by one-fifth could free up roughly ${formatAmount(dining.total * 0.2)}.`,
    })
  }
  if (shopping && shopping.total > 0) {
    recommendations.push({
      impact: Math.round(shopping.total * 0.15),
      title: "Add a pause to shopping purchases",
      explanation: `A 15% reduction in Shopping would preserve around ${formatAmount(shopping.total * 0.15)} while keeping the biggest part of your current habits intact.`,
    })
  }
  if (snapshot.netSaved > 0) {
    recommendations.push({
      impact: Math.round(snapshot.netSaved * 0.1),
      title: "Automate part of your monthly surplus",
      explanation: `You saved ${formatAmount(snapshot.netSaved)} in this period. Moving 10% of that surplus automatically can build a buffer without changing your day-to-day spending.`,
    })
  }

  return recommendations.sort((a, b) => b.impact - a.impact).slice(0, 4)
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount)
}
