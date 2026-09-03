import OpenAI from "openai"
import { CATEGORIES, type Category, type Transaction } from "./schema"

const DEFAULT_DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
const DEFAULT_MODEL = "qwen3.7"

export async function extractTransactions(
  text: string
): Promise<Transaction[]> {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY is not configured.")
  }

  return extractWithQwen(text)
}

async function extractWithQwen(text: string): Promise<Transaction[]> {
  const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.DASHSCOPE_BASE_URL || DEFAULT_DASHSCOPE_BASE_URL,
  })

  const response = await client.chat.completions.create({
    model: process.env.DASHSCOPE_MODEL || DEFAULT_MODEL,
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
    const category = normalizeCategory(item.category, type)
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

function normalizeCategory(
  value: unknown,
  type: Transaction["type"]
): Category {
  if (typeof value === "string") {
    const match = CATEGORIES.find(
      (category) => category.toLowerCase() === value.toLowerCase()
    )
    if (match) return match
  }
  if (type === "credit") return "Income"
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
