import type OpenAI from "openai"
import { formatMoney } from "@/lib/format"
import { chatCompletion } from "@/lib/llm"
import { filterTransactions, type TransactionFilters } from "./filter"
import { CATEGORIES, type StatementReport, type Transaction } from "./schema"

export type ChatMessage = { role: "user" | "assistant"; content: string }

type MessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam
type SearchArgs = TransactionFilters & {
  sort?: "newest" | "largest"
  limit?: number
}

const MAX_TOOL_ROUNDS = 4
const DEFAULT_ROWS = 20
const MAX_ROWS = 60

const SEARCH_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_transactions",
    description:
      "Search the statement's transactions. Returns the match count, totals for money in and out across ALL matches, and up to `limit` matching rows as [date, merchant, description, signedAmount, category]. Call with no filters to list everything.",
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
      ...(round < MAX_TOOL_ROUNDS ? { tools: [SEARCH_TOOL] } : {}),
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
        content: searchTransactions(
          report.transactions,
          parseArgs(call.function.arguments)
        ),
      })
    }
  }

  return "I couldn't find an answer to that."
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
    spendingByCategory: report.categories,
    recurringCharges: report.subscriptions,
    possibleDuplicates: report.duplicates.length,
    healthScore: report.healthScore,
  }

  return `You are ezFinance's assistant. Answer questions about the user's bank statement using only the summary below and the search_transactions tool.
- Use the tool for anything about specific merchants, dates, amounts, or transactions. Never guess or add up numbers yourself; use the tool's totals.
- Money is in ${report.currency}. Format amounts like ${formatMoney(12500, report.currency)}.
- Be concise and friendly: short paragraphs or "-" bullets. No headings, tables, or bold text.
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

function total(transactions: Transaction[], type: Transaction["type"]) {
  return transactions
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + item.amount, 0)
}
