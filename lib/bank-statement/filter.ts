import type { Category, Transaction } from "./schema"

export type TransactionFilters = {
  search?: string
  category?: Category
  type?: Transaction["type"]
  /** Inclusive, YYYY-MM-DD */
  from?: string
  /** Inclusive, YYYY-MM-DD */
  to?: string
  minAmount?: number
  maxAmount?: number
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  const search = filters.search?.trim().toLowerCase()

  return transactions.filter(
    (transaction) =>
      (!search ||
        `${transaction.merchant} ${transaction.description}`
          .toLowerCase()
          .includes(search)) &&
      (!filters.category || transaction.category === filters.category) &&
      (!filters.type || transaction.type === filters.type) &&
      (!filters.from || transaction.date >= filters.from) &&
      (!filters.to || transaction.date.slice(0, 10) <= filters.to) &&
      (filters.minAmount === undefined ||
        transaction.amount >= filters.minAmount) &&
      (filters.maxAmount === undefined ||
        transaction.amount <= filters.maxAmount)
  )
}
