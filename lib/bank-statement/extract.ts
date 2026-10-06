import { chatCompletion } from "@/lib/llm"
import { CATEGORIES, type Category, type Transaction } from "./schema"

// Each chunk is one parallel LLM call. Smaller chunks mean less output per
// call (output tokens dominate latency), at the cost of more requests.
const CHUNK_CHARS = 6_000
const CONCURRENCY = 8

const SYSTEM_PROMPT = `You extract bank statement transactions. Reply with JSON only, in this shape:
{"rows":[[date,description,merchant,amount,type,balance,category]]}
- date: "YYYY-MM-DD"
- description: the transaction narration, trimmed to 80 characters
- merchant: short clean counterparty name, e.g. "Uber", "MTN", "John Doe"
- amount: positive number
- type: "D" for money out, "C" for money in
- balance: balance after the transaction as a number, or null
- category: one of ${CATEGORIES.join(", ")}
Do not invent rows. Skip page headers, column titles, totals, account details, and opening/closing balance lines. Categorize credits as Income unless they are clearly transfers or refunds. Keep the statement order. If there are no transactions, return {"rows":[]}.`

export async function extractTransactions(
  pages: string[]
): Promise<Transaction[]> {
  const startedAt = performance.now()
  const chunks = chunkPages(pages)
  const results = await mapWithConcurrency(
    chunks,
    CONCURRENCY,
    (chunk, index) =>
      timed(`[extract] chunk ${index + 1}/${chunks.length}`, () =>
        extractChunk(chunk).catch(() => extractChunk(chunk))
      )
  )
  const transactions = results.flat()

  console.info(
    `[extract] ${transactions.length} transactions from ${pages.length} pages in ${chunks.length} chunks: ${elapsed(startedAt)}`
  )
  return transactions
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = performance.now()
  try {
    return await fn()
  } finally {
    console.info(`${label}: ${elapsed(startedAt)}`)
  }
}

export function elapsed(startedAt: number): string {
  return `${((performance.now() - startedAt) / 1000).toFixed(2)}s`
}

async function extractChunk(text: string): Promise<Transaction[]> {
  const response = await chatCompletion({
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("The model returned an empty extraction.")
  return normalizeRows(JSON.parse(content))
}

/** Packs whole pages into chunks, splitting only pages that are too large. */
function chunkPages(pages: string[]): string[] {
  const chunks: string[] = []
  let current = ""

  const push = (text: string) => {
    if (current && current.length + text.length > CHUNK_CHARS) {
      chunks.push(current)
      current = ""
    }
    current += current ? `\n${text}` : text
  }

  for (const page of pages.map(compactText).filter(Boolean)) {
    if (page.length <= CHUNK_CHARS) {
      push(page)
      continue
    }
    for (const line of page.split("\n")) push(line)
  }
  if (current) chunks.push(current)
  return chunks
}

function compactText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index], index)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return results
}

function normalizeRows(value: unknown): Transaction[] {
  if (!isRecord(value) || !Array.isArray(value.rows)) return []

  return value.rows.flatMap((row) => {
    if (!Array.isArray(row)) return []
    const [rawDate, rawDescription, rawMerchant, rawAmount, rawType] = row
    const description = asString(rawDescription)
    const date = asString(rawDate)
    const amount = Math.abs(asNumber(rawAmount))
    if (!description || !date || !Number.isFinite(amount) || amount === 0)
      return []

    const type = rawType === "C" ? "credit" : "debit"
    const balance = asNumber(row[5])

    return [
      {
        date,
        description,
        merchant: asString(rawMerchant) || normalizeMerchant(description),
        amount,
        type,
        category: normalizeCategory(row[6], type),
        ...(Number.isFinite(balance) ? { balance } : {}),
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
  return type === "credit" ? "Income" : "Other"
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
  if (typeof value === "string" && value.trim())
    return Number(value.replace(/[^\d.+-]/g, ""))
  return Number.NaN
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
