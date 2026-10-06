import { chatCompletion } from "@/lib/llm"
import { reconcileBalances } from "./reconcile"
import { CATEGORIES, type Category, type Transaction } from "./schema"

// Each chunk is one parallel LLM call. Smaller chunks mean less output per
// call (output tokens dominate latency), at the cost of more requests.
const CHUNK_CHARS = 6_000
const CONCURRENCY = 8
const FALLBACK_CURRENCY = "NGN"
const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf("currency"))

const SYSTEM_PROMPT = `You extract bank statement transactions. Reply with JSON only, in this shape:
{"currency":"NGN","rows":[[date,description,merchant,amount,type,balance,category]]}
- currency: ISO 4217 code of the account currency, from symbols, codes or the bank's country; null if unclear
- date: "YYYY-MM-DD"
- description: the transaction narration, trimmed to 80 characters
- merchant: short clean counterparty name, e.g. "Uber", "MTN", "John Doe"
- amount: positive number
- type: "D" for money out, "C" for money in
- balance: the balance after the transaction, usually the last amount in the row. Always fill it in when the row shows one; null only if the row truly has none
- category: one of ${CATEGORIES.join(", ")}
Rows may wrap across several lines; join them. Later pages often repeat no column titles, so use the "Columns:" line given with the text. Narration labels such as "inward transfer" can be wrong: fees, charges, VAT, levies and stamp duty are money out; reversals and refunds are money in.
Do not invent rows. Skip page headers, column titles, totals, account details, and opening/closing balance lines. Categorize credits as Income unless they are clearly transfers or refunds. Keep the statement order. If there are no transactions, return {"currency":null,"rows":[]}.`

type Extraction = { transactions: Transaction[]; currency: string }
type ChunkExtraction = { transactions: Transaction[]; currency?: string }

export async function extractTransactions(
  pages: string[]
): Promise<Extraction> {
  const startedAt = performance.now()
  // Later pages lack the column titles, and a page starting "10/05/24" is
  // ambiguous on its own, so every chunk gets this context.
  const header = findColumnHeader(pages)
  const dateOrder = detectDateOrder(pages)
  const context = [
    header && `Columns: ${header}`,
    dateOrder && `Dates are written ${dateOrder}.`,
  ]
    .filter(Boolean)
    .join("\n")
  const chunks = chunkPages(pages).map((chunk) =>
    context ? `${context}\n\n${chunk}` : chunk
  )
  const results = await mapWithConcurrency(
    chunks,
    CONCURRENCY,
    (chunk, index) =>
      timed(`[extract] chunk ${index + 1}/${chunks.length}`, () =>
        extractChunkWithRetry(chunk)
      )
  )
  const { transactions, stats } = reconcileBalances(
    results.flatMap((result) => result.transactions)
  )
  const currency = mostCommon(results.map((result) => result.currency))

  console.info(
    `[extract] ${transactions.length} ${currency ?? "unknown-currency"} transactions from ${pages.length} pages in ${chunks.length} chunks: ${elapsed(startedAt)}`,
    stats
  )
  return { transactions, currency: currency ?? FALLBACK_CURRENCY }
}

/** Retries once on errors, or when most rows came back without a balance. */
async function extractChunkWithRetry(text: string): Promise<ChunkExtraction> {
  const first = await extractChunk(text).catch(() => undefined)
  if (first && missingBalanceRatio(first.transactions) <= 0.5) return first

  const second = await extractChunk(text).catch((error) => {
    if (first) return first
    throw error
  })
  return first &&
    missingBalanceRatio(first.transactions) <
      missingBalanceRatio(second.transactions)
    ? first
    : second
}

function missingBalanceRatio(transactions: Transaction[]) {
  if (!transactions.length) return 0
  return (
    transactions.filter((item) => item.balance === undefined).length /
    transactions.length
  )
}

/** Day-first or month-first, from the first numeric date that settles it. */
function detectDateOrder(pages: string[]): string | undefined {
  for (const [, first, second] of pages
    .join("\n")
    .matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}\b/g)) {
    if (Number(first) > 12) return "day-first (DD/MM/YY)"
    if (Number(second) > 12) return "month-first (MM/DD/YY)"
  }
  return undefined
}

/** The column titles row, which statements usually print on the first page only. */
function findColumnHeader(pages: string[]): string | undefined {
  return pages
    .flatMap((page) => compactText(page).split("\n"))
    .find(
      (line) =>
        line.length < 200 && /\bdate/i.test(line) && /\bbalance\b/i.test(line)
    )
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

async function extractChunk(text: string): Promise<ChunkExtraction> {
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
  const parsed: unknown = JSON.parse(content)
  return {
    transactions: normalizeRows(parsed),
    currency: isRecord(parsed) ? normalizeCurrency(parsed.currency) : undefined,
  }
}

function normalizeCurrency(value: unknown): string | undefined {
  const code = asString(value).toUpperCase()
  return SUPPORTED_CURRENCIES.has(code) ? code : undefined
}

function mostCommon(values: (string | undefined)[]): string | undefined {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
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
