import type OpenAI from "openai"
import { formatMoney } from "@/lib/format"
import { chatCompletion } from "@/lib/llm"
import { balanceByPeriod, type BalancePeriod } from "./analyze"
import { filterTransactions, type TransactionFilters } from "./filter"
import { CATEGORIES, type StatementReport, type Transaction } from "./schema"

export type ChatMessage = { role: "user" | "assistant"; content: string }

type MessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam
type SearchArgs = TransactionFilters & {
  sort?: "newest" | "largest"
  limit?: number
}
type BalanceArgs = { period: BalancePeriod; from?: string; to?: string }
type Tool = OpenAI.Chat.Completions.ChatCompletionTool

const MAX_TOOL_ROUNDS = 4
const DEFAULT_ROWS = 20
const MAX_ROWS = 60

const SEARCH_TOOL: Tool = {
  type: "function",
  function: {
    name: "search_transactions",
    description:
      "Search the statement's transactions. Returns the match count, totals for money in and out across ALL matches, and up to `limit` matching rows as [date, merchant, description, signedAmount, category, balanceAfter]. Call with no filters to list everything.",
    parameters: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Text to match in the merchant or description",
        },
        category: { type: "string", enum: [...CATEGORIES] },
        type: {
          type: "string",
          enum: ["debit", "credit"],
          description: "debit = money out, credit = money in",
        },
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
        minAmount: { type: "number" },
        maxAmount: { type: "number" },
        sort: { type: "string", enum: ["newest", "largest"] },
        limit: { type: "number", description: `Max rows, up to ${MAX_ROWS}` },
      },
    },
  },
}

const BALANCE_TOOL: Tool = {
  type: "function",
  function: {
    name: "get_balance_history",
    description:
      "The account balance over time, as plotted on the report's balance chart. Returns the balance after the first and last transactions in range, the lowest and highest balance with their dates, and the closing balance per day, week (keyed by its Monday) or month.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["daily", "weekly", "monthly"] },
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
      },
      required: ["period"],
    },
  },
}

const DUPLICATES_TOOL: Tool = {
  type: "function",
  function: {
    name: "get_possible_duplicates",
    description:
      "Pairs of charges that look like duplicates (same merchant and amount within 2 days), as [date, merchant, amount] for each charge in the pair.",
    parameters: { type: "object", properties: {} },
  },
}

const PERIOD_COLUMN: Record<BalancePeriod, string> = {
  daily: "date",
  weekly: "weekStartingMonday",
  monthly: "month",
}

const TOOLS = [SEARCH_TOOL, BALANCE_TOOL, DUPLICATES_TOOL]

export async function answerQuestion(
  report: StatementReport,
  history: ChatMessage[]
): Promise<string> {
  const messages: MessageParam[] = [
    { role: "system", content: buildSystemPrompt(report) },
    ...history,
  ]

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await chatCompletion({
      temperature: 0.2,
      messages,
      // Final round has no tools so the model must answer.
      ...(round < MAX_TOOL_ROUNDS ? { tools: TOOLS } : {}),
    })
    const message = response.choices[0]?.message
    const calls =
      message?.tool_calls?.filter((call) => call.type === "function") ?? []

    if (!calls.length) {
      return message?.content?.trim() || "I couldn't find an answer to that."
    }

    messages.push({
      role: "assistant",
      content: message?.content ?? null,
      tool_calls: calls,
    })
    for (const call of calls) {
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: runTool(report, call.function.name, call.function.arguments),
      })
    }
  }

  return "I couldn't find an answer to that."
}

function runTool(report: StatementReport, name: string, args: string) {
  switch (name) {
    case "search_transactions":
      return searchTransactions(report.transactions, parseArgs(args))
    case "get_balance_history":
      return balanceHistory(report, parseBalanceArgs(args))
    case "get_possible_duplicates":
      return JSON.stringify(
        report.duplicates.map(({ first, second }) =>
          [first, second].map((item) => [item.date, item.merchant, item.amount])
        )
      )
    default:
      return JSON.stringify({ error: `Unknown tool ${name}` })
  }
}

function balanceHistory(report: StatementReport, args: BalanceArgs): string {
  const points = report.runningBalance.filter(
    (point) =>
      (!args.from || point.date >= args.from) &&
      (!args.to || point.date.slice(0, 10) <= args.to)
  )
  if (!points.length) {
    return JSON.stringify({ error: "No balance data for that range." })
  }

  const lowest = points.reduce((low, point) =>
    point.balance < low.balance ? point : low
  )
  const highest = points.reduce((high, point) =>
    point.balance > high.balance ? point : high
  )
  const series = balanceByPeriod(points, args.period)

  return JSON.stringify({
    first: [points[0].date, points[0].balance],
    closing: [points.at(-1)!.date, points.at(-1)!.balance],
    lowest: [lowest.date, lowest.balance],
    highest: [highest.date, highest.balance],
    closingBalanceColumns: [PERIOD_COLUMN[args.period], "closingBalance"],
    closingBalances: series
      .slice(-MAX_ROWS)
      .map(({ period, balance }) => [period, balance]),
    ...(series.length > MAX_ROWS
      ? { note: `Showing the last ${MAX_ROWS} ${args.period} balances` }
      : {}),
  })
}

function searchTransactions(
  transactions: Transaction[],
  args: SearchArgs
): string {
  const matches = filterTransactions(transactions, args)
  const sorted = [...matches].sort((a, b) =>
    args.sort === "largest" ? b.amount - a.amount : b.date.localeCompare(a.date)
  )
  const limit = Math.min(Math.max(1, args.limit ?? DEFAULT_ROWS), MAX_ROWS)

  return JSON.stringify({
    count: matches.length,
    totalIn: total(matches, "credit"),
    totalOut: total(matches, "debit"),
    rows: sorted
      .slice(0, limit)
      .map((item) => [
        item.date,
        item.merchant,
        item.description,
        item.type === "credit" ? item.amount : -item.amount,
        item.category,
        item.balance ?? null,
      ]),
    ...(matches.length > limit ? { note: `Showing ${limit} rows` } : {}),
  })
}

function buildSystemPrompt(report: StatementReport): string {
  const dates = report.transactions.map((item) => item.date).sort()
  const summary = {
    file: report.fileName,
    period: report.statementPeriod,
    firstDate: dates[0],
    lastDate: dates.at(-1),
    currency: report.currency,
    transactionCount: report.transactions.length,
    snapshot: report.snapshot,
    activity: report.activity,
    balanceAfterFirstTransaction: report.runningBalance[0]?.balance,
    closingBalance: report.runningBalance.at(-1)?.balance,
    spendingByCategory: report.categories,
    recurringCharges: report.subscriptions,
    possibleDuplicates: report.duplicates.length,
    healthScore: report.healthScore,
    recommendations: report.recommendations,
  }

  return `You are ezFinance's assistant. Answer questions about the user's bank statement using only the summary below and your tools.
- Use search_transactions for anything about specific merchants, dates, amounts, or transactions. Never guess or add up numbers yourself; use the tool's totals.
- Use get_balance_history for the account balance over time (the report's balance chart): closing, lowest or highest balance, or the balance on a date.
- Use get_possible_duplicates to name the charges that look duplicated.
- The summary's healthScore (savings rate, recurring load, net saved) and recommendations (estimated monthly savings) are the report's own figures; explain them, don't recompute them.
- Money is in ${report.currency}. Format amounts like ${formatMoney(12500, report.currency)}.
- Be concise and friendly. Reply in Markdown: short paragraphs, "-" bullets, **bold** for key figures, and a small table only when comparing several items. No headings.
- If the statement can't answer the question, say so.

Statement summary:
${JSON.stringify(summary)}`
}

function parseArgs(json: string): SearchArgs {
  let raw: Record<string, unknown> = {}
  try {
    raw = JSON.parse(json || "{}")
  } catch {}

  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined
  const num = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined

  return {
    search: text(raw.search),
    category: CATEGORIES.find((category) => category === raw.category),
    type: raw.type === "debit" || raw.type === "credit" ? raw.type : undefined,
    from: text(raw.from),
    to: text(raw.to),
    minAmount: num(raw.minAmount),
    maxAmount: num(raw.maxAmount),
    sort: raw.sort === "largest" ? "largest" : "newest",
    limit: num(raw.limit),
  }
}

function parseBalanceArgs(json: string): BalanceArgs {
  let raw: Record<string, unknown> = {}
  try {
    raw = JSON.parse(json || "{}")
  } catch {}
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined

  return {
    period:
      raw.period === "weekly" || raw.period === "monthly"
        ? raw.period
        : "daily",
    from: text(raw.from),
    to: text(raw.to),
  }
}

function total(transactions: Transaction[], type: Transaction["type"]) {
  return transactions
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + item.amount, 0)
}
