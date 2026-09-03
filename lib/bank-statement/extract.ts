import OpenAI from "openai"
import { CATEGORIES, type Category, type Transaction } from "./schema"

type ExtractionResult = {
  transactions: Transaction[]
  source: "ai" | "local"
}

const DEFAULT_DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
const DEFAULT_MODEL = "qwen3.7"

const DATE_PATTERN =
  /\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{2,4})?)\b/
const MONEY_PATTERN =
  /[+-]?\s*(?:[$₦€£]|NGN|USD|EUR|GBP)?\s*\(?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\)?/gi

export async function extractTransactions(
  text: string
): Promise<ExtractionResult> {
  if (process.env.DASHSCOPE_API_KEY) {
    try {
      const transactions = await extractWithQwen(text)
      if (transactions.length > 0) return { transactions, source: "ai" }
    } catch (error) {
      console.warn(
        "Qwen extraction failed; using local extraction fallback.",
        error
      )
    }
  }

  return { transactions: extractLocally(text), source: "local" }
}

async function extractWithQwen(text: string): Promise<Transaction[]> {
  const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.DASHSCOPE_BASE_URL ?? DEFAULT_DASHSCOPE_BASE_URL,
  })

  const response = await client.chat.completions.create({
    model: process.env.DASHSCOPE_MODEL ?? DEFAULT_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You extract bank statement transactions. Return only valid JSON in this shape: {"transactions":[{"date":"YYYY-MM-DD or original date","description":"...","merchant":"...","amount":123.45,"type":"debit or credit","balance":123.45,"category":"one of ${CATEGORIES.join(", ")}","isRefund":false}]}. Amount must be positive; type carries the direction. Do not invent rows, balances, or dates. Ignore page headers, totals, account numbers, and opening/closing balance summaries. Categorize credits as Income unless they are clearly transfers or refunds.`,
      },
      {
        role: "user",
        content: `Extract every transaction from this statement text. Preserve the transaction order and use the exact description where possible.\n\n${text.slice(0, 100_000)}`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Qwen returned an empty extraction response.")

  const parsed: unknown = JSON.parse(content)
  return normalizeTransactions(parsed)
}

function normalizeTransactions(value: unknown): Transaction[] {
  if (!isRecord(value) || !Array.isArray(value.transactions)) return []

  return value.transactions.flatMap((item) => {
    if (!isRecord(item)) return []
    const description = asString(item.description)
    const date = asString(item.date)
    const amount = Math.abs(asNumber(item.amount))
    if (!description || !date || !Number.isFinite(amount) || amount === 0)
      return []

    const type = item.type === "credit" ? "credit" : "debit"
    const category = normalizeCategory(item.category, type, description)
    const balance =
      item.balance === undefined ? undefined : asNumber(item.balance)

    return [
      {
        date,
        description,
        merchant: asString(item.merchant) || normalizeMerchant(description),
        amount,
        type,
        category,
        ...(Number.isFinite(balance) ? { balance } : {}),
        ...(item.isRefund === true ? { isRefund: true } : {}),
      },
    ]
  })
}

function extractLocally(text: string): Transaction[] {
  return text.split(/\r?\n/).flatMap((line) => {
    const trimmedLine = line.trim()
    const dateMatch = DATE_PATTERN.exec(trimmedLine)
    if (!dateMatch || dateMatch.index === undefined) return []

    const afterDate = trimmedLine.slice(dateMatch.index + dateMatch[0].length)
    const amounts = [...afterDate.matchAll(MONEY_PATTERN)]
    const amountMatch = amounts[0]
    if (!amountMatch || amountMatch.index === undefined) return []

    const description = afterDate
      .slice(0, amountMatch.index)
      .replace(/[|•·]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    if (
      !description ||
      /^(date|description|transaction|opening|closing|balance)$/i.test(
        description
      )
    )
      return []

    const amount = parseMoney(amountMatch[0])
    if (!Number.isFinite(amount) || amount === 0) return []

    const type = isCreditDescription(description) ? "credit" : "debit"
    const absoluteAmount = Math.abs(amount)
    const balanceMatch = amounts[1]
    const balance = balanceMatch ? parseMoney(balanceMatch[0]) : undefined
    const normalizedBalance =
      balance !== undefined && Number.isFinite(balance)
        ? Math.abs(balance)
        : undefined

    return [
      {
        date: normalizeDate(dateMatch[1]),
        description,
        merchant: normalizeMerchant(description),
        amount: absoluteAmount,
        type,
        category: normalizeCategory(undefined, type, description),
        ...(normalizedBalance !== undefined
          ? { balance: normalizedBalance }
          : {}),
      },
    ]
  })
}

function normalizeCategory(
  value: unknown,
  type: Transaction["type"],
  description: string
): Category {
  if (typeof value === "string") {
    const match = CATEGORIES.find(
      (category) => category.toLowerCase() === value.toLowerCase()
    )
    if (match) return match
  }
  if (type === "credit") return "Income"

  const text = description.toLowerCase()
  if (/rent|mortgage|property|housing/.test(text)) return "Housing"
  if (/grocery|whole foods|market|supermarket/.test(text)) return "Groceries"
  if (/electric|water|internet|phone|utility|airtime|data/.test(text))
    return "Utilities"
  if (/restaurant|coffee|cafe|food|dining|pizza|mcdonald|starbucks/.test(text))
    return "Dining Out"
  if (/netflix|spotify|prime|subscription|chatgpt|youtube/.test(text))
    return "Subscriptions"
  if (/uber|bolt|taxi|transport|bus|flight|airline/.test(text))
    return "Transport"
  if (/shell|fuel|gas station|petrol/.test(text)) return "Gas"
  if (/pharmacy|hospital|doctor|health|clinic/.test(text)) return "Healthcare"
  if (/insurance/.test(text)) return "Insurance"
  if (/amazon|shop|store|retail|clothing/.test(text)) return "Shopping"
  if (/hotel|travel|booking/.test(text)) return "Travel"
  if (/salon|barber|spa|beauty/.test(text)) return "Personal Care"
  if (/movie|cinema|game|entertainment|concert/.test(text))
    return "Entertainment"
  if (/save|investment|savings/.test(text)) return "Savings"
  return "Other"
}

function normalizeMerchant(description: string): string {
  return description
    .replace(/\b(?:ACH|POS|ATM|DEBIT|CREDIT|PAYMENT|TRANSFER)\b/gi, "")
    .replace(/[#*][A-Z0-9-]+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function normalizeDate(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const slashMatch = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/.exec(trimmed)
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0")
    const day = slashMatch[2].padStart(2, "0")
    const year = (slashMatch[3] ?? String(new Date().getFullYear())).padStart(
      4,
      "20"
    )
    return `${year}-${month}-${day}`
  }
  return trimmed
}

function parseMoney(value: string): number {
  const normalized = value.replace(/[^\d().+-]/g, "")
  const isParenthesized = normalized.startsWith("(") && normalized.endsWith(")")
  const number = Number(normalized.replace(/[()]/g, ""))
  return isParenthesized ? -number : number
}

function isCreditDescription(description: string): boolean {
  return /deposit|payroll|salary|credit|refund|interest|received|income|from\s/i.test(
    description
  )
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value.replace(/[^\d.+-]/g, ""))
  return Number.NaN
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
