"use client"

import { filterTransactions } from "@/lib/bank-statement/filter"
import {
  CATEGORIES,
  type Category,
  type Transaction,
} from "@/lib/bank-statement/schema"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_COLORS } from "@/lib/category-colors"
import { formatDate, formatMoney } from "@/lib/format"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useMemo, useState } from "react"

const PAGE_SIZE = 10

export function TransactionsTable({
  transactions,
  currency,
}: {
  transactions: Transaction[]
  currency: string
}) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<Category | null>(null)
  const [page, setPage] = useState(1)

  const newestFirst = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  )
  const categoryItems = useMemo(
    () => [
      { label: "All categories", value: null },
      ...CATEGORIES.filter((item) =>
        transactions.some((transaction) => transaction.category === item)
      ).map((item) => ({ label: item, value: item })),
    ],
    [transactions]
  )
  const filtered = useMemo(
    () =>
      filterTransactions(newestFirst, {
        search,
        category: category ?? undefined,
      }),
    [newestFirst, search, category]
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)

  return (
    <>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search merchant or description"
            aria-label="Search transactions"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white"
          />
        </label>
        <Select
          items={categoryItems}
          value={category}
          onValueChange={(value) => {
            setCategory(value)
            setPage(1)
          }}
        >
          <SelectTrigger
            aria-label="Filter by category"
            className="h-auto w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 sm:w-52"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.map((item) => (
              <SelectItem
                key={item.label}
                value={item.value}
                className="text-sm"
              >
                {item.value ? <CategoryDot category={item.value} /> : null}
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-slate-100 text-xs tracking-wider text-slate-400 uppercase">
            <tr>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Description</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction, index) => (
              <TransactionRow
                key={`${transaction.date}-${transaction.description}-${start + index}`}
                transaction={transaction}
                currency={currency}
              />
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No transactions match your search.
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
        <span>
          {filtered.length
            ? `Showing ${start + 1}–${start + rows.length} of ${filtered.length}`
            : "0 results"}
        </span>
        <div className="flex items-center gap-2">
          <PageButton
            label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </PageButton>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <PageButton
            label="Next page"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </PageButton>
        </div>
      </div>
    </>
  )
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function TransactionRow({
  transaction,
  currency,
}: {
  transaction: Transaction
  currency: string
}) {
  const isCredit = transaction.type === "credit"
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-4 whitespace-nowrap text-slate-400">
        {formatDate(transaction.date)}
      </td>
      <td className="py-4">
        <p className="font-medium text-slate-700">
          {transaction.merchant || transaction.description}
        </p>
        {transaction.merchant &&
        transaction.merchant !== transaction.description ? (
          <p className="mt-0.5 max-w-sm truncate text-xs text-slate-400">
            {transaction.description}
          </p>
        ) : null}
      </td>
      <td className="py-4 text-slate-500">
        <span className="inline-flex items-center gap-2">
          <CategoryDot category={transaction.category} />
          {transaction.category}
        </span>
      </td>
      <td
        className={`py-4 text-right font-semibold whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-red-500"}`}
      >
        {isCredit ? "+" : "−"}
        {formatMoney(transaction.amount, currency)}
      </td>
    </tr>
  )
}

function CategoryDot({ category }: { category: Category }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: CATEGORY_COLORS[category] }}
    />
  )
}
