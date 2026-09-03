"use client"

import type { StatementReport, Transaction } from "@/lib/bank-statement/schema"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  RefreshCw,
  Sparkles,
  WalletCards,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { useSyncExternalStore } from "react"

const REPORT_STORAGE_KEY = "ezfinance:last-report"
const REPORT_UPDATED_EVENT = "ezfinance:report-updated"

export function ReportPage() {
  const report = useSyncExternalStore(
    subscribeToReport,
    getStoredReport,
    getServerReport
  )

  if (!report) {
    return (
      <main className="min-h-[70vh] bg-[#f7f8fa] px-6 py-24">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
          <WalletCards className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-5 text-2xl font-semibold text-slate-800">
            No report found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Upload a statement first and your completed report will appear here.
          </p>
          <Link
            href="/analyzer"
            className="mt-7 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
          >
            Analyze a statement
          </Link>
        </div>
      </main>
    )
  }

  return <ReportContent report={report} />
}

let storedReport: StatementReport | null | undefined
let storedReportJson: string | null | undefined

function subscribeToReport(callback: () => void) {
  window.addEventListener(REPORT_UPDATED_EVENT, callback)
  return () => window.removeEventListener(REPORT_UPDATED_EVENT, callback)
}

function getStoredReport(): StatementReport | null {
  const value = window.sessionStorage.getItem(REPORT_STORAGE_KEY)
  if (value === storedReportJson) return storedReport ?? null

  storedReportJson = value
  try {
    storedReport = value ? (JSON.parse(value) as StatementReport) : null
  } catch {
    storedReport = null
  }
  return storedReport
}

function getServerReport(): null {
  return null
}

function ReportContent({ report }: { report: StatementReport }) {
  const { snapshot } = report
  const currency = report.currency || "NGN"

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-8 text-slate-800 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/analyzer"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Upload another statement
        </Link>

        <header className="mt-8 flex flex-col justify-between gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-600 uppercase">
              Completed report
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#3f5064] sm:text-5xl">
              Your full spending report
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              {report.fileName} · {report.statementPeriod} · {report.pages}{" "}
              {report.pages === 1 ? "page" : "pages"}
            </p>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            Ready to review
          </div>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="rounded-3xl bg-[#3f5064] p-7 text-white shadow-sm">
            <p className="text-sm text-slate-300">
              Net saved in {report.statementPeriod}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
              {formatMoney(snapshot.netSaved, currency)}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              {formatPercent(snapshot.savingsRate)} of income
            </p>
          </div>
          <MetricCard
            label="Income"
            value={formatMoney(snapshot.totalIn, currency)}
            icon={<ArrowUpRight className="h-4 w-4" />}
            tone="green"
          />
          <MetricCard
            label="Spent"
            value={formatMoney(snapshot.totalOut, currency)}
            icon={<ArrowDownRight className="h-4 w-4" />}
            tone="red"
          />
          <MetricCard
            label="Activity"
            value={`${report.activity.transactionCount} tx`}
            detail={`${formatMoney(report.activity.averageTransaction, currency)} average`}
            icon={<WalletCards className="h-4 w-4" />}
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
            <SectionHeading
              icon={<Sparkles className="h-5 w-5" />}
              title="Find money you're leaving on the table"
              subtitle="Practical opportunities based on your actual statement."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {report.recommendations.map((recommendation) => (
                <div
                  key={recommendation.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-xl font-semibold text-emerald-600">
                    {formatMoney(recommendation.impact, currency)}
                    <span className="text-xs font-normal text-slate-400">
                      {" "}
                      / mo
                    </span>
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {recommendation.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {recommendation.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
            <SectionHeading
              icon={<RefreshCw className="h-5 w-5" />}
              title="Spot recurring charges"
              subtitle={`${report.subscriptions.length} recurring charge${report.subscriptions.length === 1 ? "" : "s"} detected`}
            />
            {report.subscriptions.length ? (
              <div className="mt-5 space-y-3">
                {report.subscriptions.slice(0, 5).map((subscription) => (
                  <div
                    key={subscription.merchant}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-slate-700">
                        {subscription.merchant}
                      </p>
                      <p className="text-xs text-slate-400">
                        {subscription.occurrences} occurrence
                        {subscription.occurrences === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-700">
                      {formatMoney(subscription.monthlyCost, currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No recurring charges were detected." />
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
            <SectionHeading
              title="See where every naira went"
              subtitle={`${formatMoney(snapshot.totalOut, currency)} across ${report.categories.length} categories`}
            />
            <div className="mt-6 space-y-5">
              {report.categories.length ? (
                report.categories.map((category) => (
                  <div key={category.category}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {category.category}
                      </span>
                      <span className="text-slate-500">
                        {formatMoney(category.total, currency)} ·{" "}
                        {formatPercent(category.pct)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${Math.max(3, category.pct * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="No debit categories were found." />
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
            <SectionHeading
              title="Your financial health, scored"
              subtitle="A transparent score based on savings and recurring load."
            />
            <div className="mt-6 flex items-center gap-6">
              <div
                className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#34d399 ${report.healthScore.score * 3.6}deg, #e2e8f0 0deg)`,
                }}
              >
                <div className="grid h-24 w-24 place-items-center rounded-full bg-white">
                  <span className="text-3xl font-semibold text-slate-700">
                    {report.healthScore.score}
                  </span>
                  <span className="-mt-2 text-xs text-slate-400">/ 100</span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-700">
                  {report.healthScore.label}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Savings rate:{" "}
                  <strong className="text-slate-700">
                    {formatPercent(snapshot.savingsRate)}
                  </strong>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Expense count:{" "}
                  <strong className="text-slate-700">
                    {snapshot.expenseCount}
                  </strong>
                </p>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 text-sm">
              <HealthLine
                label="Savings rate"
                value={formatPercent(snapshot.savingsRate)}
                positive={snapshot.savingsRate >= 0.2}
              />
              <HealthLine
                label="Duplicate charges"
                value={`${report.duplicates.length} found`}
                positive={!report.duplicates.length}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
          <SectionHeading
            title="Recent transactions"
            subtitle={`${report.activity.activeDays} active day${report.activity.activeDays === 1 ? "" : "s"} · ${report.transactions.length} total transaction${report.transactions.length === 1 ? "" : "s"}`}
          />
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
                {report.transactions.slice(0, 12).map((transaction, index) => (
                  <TransactionRow
                    key={`${transaction.date}-${transaction.description}-${index}`}
                    transaction={transaction}
                    currency={currency}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {report.transactions.length > 12 ? (
            <p className="mt-4 text-center text-xs text-slate-400">
              Showing the first 12 transactions from your report.
            </p>
          ) : null}
        </section>

        {report.duplicates.length ? (
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>
              <strong>
                {report.duplicates.length} possible duplicate charge
                {report.duplicates.length === 1 ? "" : "s"}
              </strong>{" "}
              detected. Review the matching transactions before taking action.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string
  value: string
  detail?: string
  icon: ReactNode
  tone?: "default" | "green" | "red"
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone === "green" ? "bg-emerald-50 text-emerald-600" : tone === "red" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"}`}
      >
        {icon}
      </div>
      <p className="mt-5 text-xs tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-700">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
    </div>
  )
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3">
      {icon ? <div className="mt-0.5 text-emerald-500">{icon}</div> : null}
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-700">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

function HealthLine({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive: boolean
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {positive ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        )}
        {label}
      </div>
      <p className="mt-1 font-medium text-slate-700">{value}</p>
    </div>
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
      <td className="py-4 text-slate-400">{formatDate(transaction.date)}</td>
      <td className="py-4 font-medium text-slate-700">
        {transaction.merchant || transaction.description}
      </td>
      <td className="py-4 text-slate-500">{transaction.category}</td>
      <td
        className={`py-4 text-right font-semibold ${isCredit ? "text-emerald-600" : "text-slate-700"}`}
      >
        {isCredit ? "+" : "−"}
        {formatMoney(transaction.amount, currency)}
      </td>
    </tr>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text}</p>
  )
}
function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0)
}
function formatPercent(value: number) {
  return `${Math.round((value || 0) * 1000) / 10}%`
}
function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NG", {
        month: "short",
        day: "numeric",
      }).format(date)
}
