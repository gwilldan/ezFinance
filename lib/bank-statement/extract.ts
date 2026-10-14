import { chatCompletion } from "@/lib/llm"
import { applyMerchantCatalog } from "./merchants"
import { chainBreaks, reconcileBalances } from "./reconcile"
import { CATEGORIES, type Category, type Transaction } from "./schema"

// Each chunk is one parallel LLM call. Smaller chunks mean less output per
// call (output tokens dominate latency), at the cost of more requests.
const CHUNK_CHARS = 6_000
const CONCURRENCY = 8
// Reads per chunk at most: the first plus retries while rows still don't chain.
const MAX_ATTEMPTS = 3
// Re-read rounds for chunks whose balances break against their neighbours,
// and how many neighbouring rows that check includes on each side.
const BOUNDARY_ROUNDS = 2
const BOUNDARY_ROWS = 3
const FALLBACK_CURRENCY = "NGN"
const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf("currency"))

const SYSTEM_PROMPT = `You extract bank statement transactions. Reply with JSON only, in this shape:
{"currency":"NGN","rows":[[date,description,merchant,amount,type,balance,category,account,bank]]}
- currency: ISO 4217 code of the account currency, from symbols, codes or the bank's country; null if unclear
- date: "YYYY-MM-DD"
- description: the transaction narration, trimmed to 80 characters
- merchant: short clean name of the person or business on the other side, e.g. "Uber", "MTN", "John Doe"; never the bank or payment app the money went through (Opay, Moniepoint, Palmpay) unless it is the counterparty itself
- amount: positive number
- type: "D" for money out, "C" for money in
- balance: the balance after the transaction, usually the last amount in the row. Always fill it in when the row shows one; null only if the row truly has none. Copy it exactly as printed; never calculate it. An overdrawn balance is negative: keep the sign when it's shown as "-1,234.00", "(1,234.00)" or "1,234.00 DR", and add none that isn't printed
- the amount and the balance are always two different numbers in the row; never copy the balance into the amount, even when the balance is negative
- category: one of ${CATEGORIES.join(", ")}. Money in is Income, including money from people, unless it reverses or refunds a payment (then use that payment's category). Transfers: money out to a person or another account when nothing shows what it paid for. Bank Charges: fees, stamp duty, VAT on fees, SMS alerts, levies and overdraft interest
- account: the counterparty's account number, digits only. Numbers often wrap across lines ("81285085" then "39" is "8128508539"); join them. null when the row shows none; never the statement's own account number
- bank: the counterparty's bank or wallet as printed, e.g. "Paycom(Opay)", "First Bank Of Nigeria"; null when the row shows none
Rows may wrap across several lines; join them. Later pages often repeat no column titles, so use the "Columns:" line given with the text. Narration labels such as "inward transfer" can be wrong: fees, charges, VAT, levies and stamp duty are money out; reversals and refunds are money in.
Do not invent rows. Skip page headers, column titles, totals, account details, and opening/closing balance lines. Keep the statement order. If there are no transactions, return {"currency":null,"rows":[]}.`

type Extraction = { transactions: Transaction[]; currency: string }
type ChunkExtraction = { transactions: Transaction[]; currency?: string }
type ChunkReader = (
  text: string,
  temperature: number
) => Promise<ChunkExtraction>
export type ExtractOptions = {
  /** Called as each chunk's read finishes, starting at 0 of the total. */
  onProgress?: (done: number, total: number) => void
  /** Stops the remaining model calls, e.g. when nobody is waiting anymore. */
  signal?: AbortSignal
}

export async function extractTransactions(
  pages: string[],
  { onProgress, signal }: ExtractOptions = {}
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
  // Every model call, re-reads included, so rate-limit pressure shows in logs.
  let calls = 0
  const read: ChunkReader = (text, temperature) => {
    // Thrown synchronously, so it skips the retry loops' `.catch` and stops
    // the whole extraction instead of counting as a failed read.
    signal?.throwIfAborted()
    calls += 1
    return extractChunk(text, temperature, signal)
  }
  let done = 0
  onProgress?.(done, chunks.length)
  const results = await mapWithConcurrency(
    chunks,
    CONCURRENCY,
    async (chunk) => {
      const result = await extractChunkWithRetry(chunk, read)
      onProgress?.((done += 1), chunks.length)
      return result
    }
  )
  await rereadBrokenBoundaries(chunks, results, read)
  signal?.throwIfAborted()
  const reconciled = reconcileBalances(
    results.flatMap((result) => result.transactions)
  )
  // After reconciling, so a catalog entry for one side (a fee is money out)
  // sees each row's corrected direction.
  const catalog = applyMerchantCatalog(reconciled.transactions)
  const transactions = catalog.transactions.map(settleCategory)
  const currency = mostCommon(results.map((result) => result.currency))

  console.info("[extract]", {
    pages: pages.length,
    chunks: chunks.length,
    calls,
    transactions: transactions.length,
    currency: currency ?? "unknown",
    time: elapsed(startedAt),
    catalogMatches: catalog.matched,
    ...reconciled.stats,
  })
  return { transactions, currency: currency ?? FALLBACK_CURRENCY }
}

/**
 * Re-reads a chunk whose rows still don't chain after reconciling, or that
 * mostly lack balances, and keeps the cleanest read. Reads vary, so a misread
 * row is usually right on another attempt; clean chunks cost one call.
 */
async function extractChunkWithRetry(
  text: string,
  read: ChunkReader
): Promise<ChunkExtraction> {
  let best: { result: ChunkExtraction; score: number } | undefined
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    // Retries vary the read a little; the first is as deterministic as it gets.
    const result = await read(text, attempt ? 0.3 : 0).catch((error) => {
      lastError = error
      return undefined
    })
    if (!result) continue

    const score = readScore(result.transactions)
    if (!best || score < best.score) best = { result, score }
    if (best.score === 0) break
  }

  if (!best) throw lastError
  return best.result
}

/**
 * A chunk only checks its own rows, so a misread first row (or one that
 * throws off every balance after it) can't be caught inside it. Each chunk is
 * checked again between the end of the chunk before and the start of the
 * chunk after, and re-read where the balances break; a re-read is kept only
 * when it breaks less.
 */
async function rereadBrokenBoundaries(
  chunks: string[],
  results: ChunkExtraction[],
  read: ChunkReader
) {
  for (let round = 0; round < BOUNDARY_ROUNDS; round += 1) {
    const broken = results.flatMap((_, index) =>
      boundaryBreaks(results, index) ? [index] : []
    )
    if (!broken.length) return

    await mapWithConcurrency(broken, CONCURRENCY, async (index) => {
      const reread = await read(chunks[index], 0.3).catch(() => undefined)
      if (!reread) return
      const candidate = results.with(index, reread)
      if (boundaryBreaks(candidate, index) < boundaryBreaks(results, index)) {
        results[index] = reread
      }
    })
  }
}

/** Breaks in a chunk read together with its neighbours' adjoining rows. */
function boundaryBreaks(results: ChunkExtraction[], index: number) {
  return chainBreaks([
    ...(results[index - 1]?.transactions.slice(-BOUNDARY_ROWS) ?? []),
    ...results[index].transactions,
    ...(results[index + 1]?.transactions.slice(0, BOUNDARY_ROWS) ?? []),
  ])
}

/** Lower is better: breaks left after reconciling, then missing balances. */
function readScore(transactions: Transaction[]) {
  const missing = missingBalanceRatio(transactions)
  return chainBreaks(transactions) + (missing > 0.5 ? missing : 0)
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

export function elapsed(startedAt: number): string {
  return `${((performance.now() - startedAt) / 1000).toFixed(2)}s`
}

async function extractChunk(
  text: string,
  temperature: number,
  signal?: AbortSignal
): Promise<ChunkExtraction> {
  const response = await chatCompletion(
    {
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    },
    { signal }
  )

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
    const account = asAccount(row[7])
    const bank = asString(row[8])

    return [
      {
        date,
        description,
        merchant: asString(rawMerchant) || normalizeMerchant(description),
        amount,
        type,
        category: normalizeCategory(row[6], type),
        ...(Number.isFinite(balance) ? { balance } : {}),
        ...(account ? { account } : {}),
        ...(bank ? { bank } : {}),
      },
    ]
  })
}

/**
 * Two calls the model makes inconsistently, even for the same counterparty
 * within one statement: money in from people is Income, and money out to an
 * account with nothing to show what it paid for is a Transfer.
 */
function settleCategory(row: Transaction): Transaction {
  if (row.type === "credit" && row.category === "Transfers")
    return { ...row, category: "Income" }
  if (row.type === "debit" && row.category === "Other" && row.account)
    return { ...row, category: "Transfers" }
  return row
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

/** Digits only; anything too short or long to be an account number is dropped. */
function asAccount(value: unknown): string | undefined {
  const digits = String(value ?? "").replace(/\D/g, "")
  return digits.length >= 6 && digits.length <= 16 ? digits : undefined
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value !== "string" || !value.trim()) return Number.NaN

  const text = value.trim()
  // Overdrawn amounts: "(1,234.00)", "1,234.00 DR", "1,234.00-".
  const negative =
    /^\(.*\)$/.test(text) || /\bDR\.?$/i.test(text) || /\d-$/.test(text)
  const number = Number(text.replace(/[^\d.+-]/g, "").replace(/(?<=\d)-$/, ""))
  return negative ? -Math.abs(number) : number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
