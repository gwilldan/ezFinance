export const CATEGORIES = [
  "Housing",
  "Groceries",
  "Utilities",
  "Dining Out",
  "Subscriptions",
  "Personal Care",
  "Shopping",
  "Insurance",
  "Transport",
  "Gas",
  "Healthcare",
  "Entertainment",
  "Travel",
  "Savings",
  "Income",
  "Other",
] as const

export type Category = (typeof CATEGORIES)[number]

export type Transaction = {
  date: string
  description: string
  merchant: string
  amount: number
  type: "debit" | "credit"
  balance?: number
  category: Category
  isRefund?: boolean
}

export type Snapshot = {
  netSaved: number
  totalIn: number
  totalOut: number
  expenseCount: number
  avgExpense: number
  largestExpense?: Transaction
  savingsRate: number
}

export type CategoryBreakdown = {
  category: Category
  total: number
  pct: number
}

export type Subscription = {
  merchant: string
  monthlyCost: number
  category: Category
  occurrences: number
}

export type DuplicatePair = {
  first: Transaction
  second: Transaction
}

export type RunningBalancePoint = {
  date: string
  balance: number
  description: string
}

export type HealthScore = {
  score: number
  label: "Excellent" | "Good" | "Needs attention" | "At risk"
}

export type Recommendation = {
  impact: number
  title: string
  explanation: string
}

export type StatementReport = {
  fileName: string
  pages: number
  currency: string
  statementPeriod: string
  generatedAt: string
  activity: {
    transactionCount: number
    averageTransaction: number
    activeDays: number
  }
  snapshot: Snapshot
  categories: CategoryBreakdown[]
  subscriptions: Subscription[]
  duplicates: DuplicatePair[]
  runningBalance: RunningBalancePoint[]
  healthScore: HealthScore
  recommendations: Recommendation[]
  transactions: Transaction[]
}
