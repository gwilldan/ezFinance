import type { Category } from "@/lib/bank-statement/schema"

// Fixed per category (never by rank) so a category keeps its color across the
// charts and the transactions table.
export const CATEGORY_COLORS: Record<Category, string> = {
  Housing: "#2a78d6",
  Groceries: "#008300",
  Utilities: "#eda100",
  "Dining Out": "#eb6834",
  Subscriptions: "#4a3aa7",
  "Personal Care": "#e87ba4",
  Shopping: "#9b4f96",
  Insurance: "#475569",
  Transport: "#5aa9e6",
  Gas: "#a0633a",
  Healthcare: "#0e9aa7",
  Entertainment: "#c026d3",
  Travel: "#74b816",
  Savings: "#6c63d9",
  Income: "#1baf7a",
  Other: "#94a3b8",
}
