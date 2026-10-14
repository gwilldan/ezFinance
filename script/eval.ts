/**
 * Runs the production extraction on every PDF in script/statements and checks
 * the result against the statement's own printed totals.
 *
 *   npm run eval                # every statement
 *   npm run eval -- kuda gtb    # only files whose name contains "kuda" or "gtb"
 *   npm run eval -- --dump      # also write <name>.out.json with the rows
 *   npm run eval -- --label     # also write <name>.labels.csv to fill in
 *
 * Expected totals sit next to each PDF as <name>.expected.json. Every field is
 * optional; copy them from the statement's summary section. "password" unlocks
 * a protected PDF (the file is git-ignored with the statements):
 *   { "currency": "NGN", "openingBalance": 0, "closingBalance": 0,
 *     "moneyIn": 0, "moneyOut": 0, "transactionCount": 0, "password": "" }
 *
 * Category accuracy is checked against <name>.labels.csv: a sample of rows
 * with the right category filled in by hand. --label writes one (never over an
 * existing file) with the model's guess in "model" and "category" left empty.
 * Rows are matched by date, direction and amount; rows left empty are skipped.
 */
import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { statementOrder } from "@/lib/bank-statement/analyze"
import { elapsed, extractTransactions } from "@/lib/bank-statement/extract"
import { PdfPasswordError, readPdfPages } from "@/lib/bank-statement/pdf"
import {
  CATEGORIES,
  type Category,
  type Transaction,
} from "@/lib/bank-statement/schema"
import { parseCsv, toCsvRow } from "@/lib/csv"

const DIR = path.resolve("script/statements")
const MAX_LISTED = 5
const LABEL_SAMPLE = 150
const LABEL_COLUMNS = [
  "date",
  "type",
  "amount",
  "merchant",
  "description",
  "model",
  "category",
] as const
// Share of labeled rows that must get the labeled category to pass.
const CATEGORY_TARGET = 0.9

type Expected = {
  password?: string
  currency?: string
  openingBalance?: number
  closingBalance?: number
  moneyIn?: number
  moneyOut?: number
  transactionCount?: number
}
type Label = Pick<Transaction, "date" | "type" | "amount" | "merchant"> & {
  category: Category
}
type Check = { name: string; pass: boolean; detail: string }
type Result = {
  file: string
  rows: number
  time: string
  checks: Check[]
  note?: string
}

const args = process.argv.slice(2)
const dump = args.includes("--dump")
const label = args.includes("--label")
const filters = args.filter((arg) => !arg.startsWith("--"))

const files = (await readdir(DIR))
  .filter((file) => file.toLowerCase().endsWith(".pdf"))
  .filter((file) => !filters.length || filters.some((f) => file.includes(f)))
  .sort()

if (!files.length) {
  console.error(`No matching PDFs in ${DIR}`)
  process.exit(1)
}

const results: Result[] = []
for (const file of files) {
  console.log(`\n━━ ${file}`)
  const result = await evaluate(file)
  for (const check of result.checks) {
    console.log(`  ${check.pass ? "✓" : "✗"} ${check.name}: ${check.detail}`)
  }
  if (result.note) console.log(`  ! ${result.note}`)
  results.push(result)
}

console.log("\nSummary")
console.table(
  results.map(({ file, rows, time, checks }) => ({
    file,
    rows,
    time,
    passed: `${checks.filter((check) => check.pass).length}/${checks.length}`,
  }))
)
process.exit(results.every((r) => r.checks.every((c) => c.pass)) ? 0 : 1)

async function evaluate(file: string): Promise<Result> {
  const base = file.replace(/\.pdf$/i, "")
  const expected = await readExpected(base)
  const startedAt = performance.now()

  try {
    const { pages } = await readPdfPages(
      new Uint8Array(await readFile(path.join(DIR, file))),
      expected.password
    )
    const { transactions, currency } = await extractTransactions(pages)
    const time = elapsed(startedAt)

    if (dump) {
      await writeFile(
        path.join(DIR, `${base}.out.json`),
        JSON.stringify({ currency, transactions }, null, 2)
      )
    }

    const rows = statementOrder(transactions).oldestFirst
    if (label) await writeLabelTemplate(base, rows)
    const labels = await readLabels(base)
    const checks = [
      ...internalChecks(rows, expected.openingBalance),
      ...expectedChecks(rows, currency, expected),
      ...(labels ? [categoryCheck(rows, labels)] : []),
    ]
    const note = Object.keys(expected).some((key) => key !== "password")
      ? undefined
      : `no ${base}.expected.json, so totals were not checked against the statement`
    return { file, rows: rows.length, time, checks, note }
  } catch (error) {
    return {
      file,
      rows: 0,
      time: elapsed(startedAt),
      checks: [
        {
          name: "extraction",
          pass: false,
          detail:
            error instanceof PdfPasswordError
              ? `${error.message} Add "password" to ${base}.expected.json.`
              : error instanceof Error
                ? error.message
                : String(error),
        },
      ],
    }
  }
}

/** Checks that need no expected values: every row has a balance that chains. */
function internalChecks(rows: Transaction[], opening?: number): Check[] {
  const missing = rows.filter((row) => row.balance === undefined)
  const breaks: string[] = []
  let previous = opening

  rows.forEach((row, index) => {
    if (row.balance === undefined) {
      previous = undefined
      return
    }
    if (previous !== undefined) {
      const expectedBalance = previous + signed(row)
      if (!near(expectedBalance, row.balance)) {
        breaks.push(
          `#${index + 1} ${row.date} ${row.merchant} ${row.type} ${money(row.amount)}: expected balance ${money(expectedBalance)}, got ${money(row.balance)}`
        )
      }
    }
    previous = row.balance
  })

  const outOfOrder = rows.filter(
    (row, index) => index > 0 && row.date < rows[index - 1].date
  )

  return [
    { name: "rows found", pass: rows.length > 0, detail: `${rows.length}` },
    {
      name: "dates in order",
      pass: !outOfOrder.length,
      detail: outOfOrder.length
        ? `${outOfOrder.length} out of order: ${list(outOfOrder.map((row) => `${row.date} ${row.merchant}`))}`
        : `${rows[0]?.date} → ${rows.at(-1)?.date}`,
    },
    {
      name: "balances present",
      pass: !missing.length,
      detail: missing.length
        ? `${missing.length} missing: ${list(missing.map((row) => `${row.date} ${row.merchant}`))}`
        : "all rows",
    },
    {
      name: "balance chain",
      pass: !breaks.length,
      detail: breaks.length
        ? `${breaks.length} breaks\n${list(breaks, "\n      ")}`
        : "unbroken",
    },
  ]
}

function expectedChecks(
  rows: Transaction[],
  currency: string,
  expected: Expected
): Check[] {
  const checks: Check[] = []
  const compare = (name: string, actual: number, target?: number) => {
    if (target === undefined) return
    checks.push({
      name,
      pass: near(actual, target),
      detail: near(actual, target)
        ? money(actual)
        : `${money(actual)}, expected ${money(target)} (off by ${money(actual - target)})`,
    })
  }

  if (expected.currency) {
    checks.push({
      name: "currency",
      pass: currency === expected.currency,
      detail:
        currency === expected.currency
          ? currency
          : `${currency}, expected ${expected.currency}`,
    })
  }
  compare("money in", total(rows, "credit"), expected.moneyIn)
  compare("money out", total(rows, "debit"), expected.moneyOut)
  compare(
    "closing balance",
    rows.at(-1)?.balance ?? Number.NaN,
    expected.closingBalance
  )
  if (expected.transactionCount !== undefined) {
    checks.push({
      name: "transaction count",
      pass: rows.length === expected.transactionCount,
      detail: `${rows.length}, expected ${expected.transactionCount}`,
    })
  }
  return checks
}

/**
 * Each labeled row is paired with an extracted row of the same date, direction
 * and amount, preferring one with the labeled category, so repeated rows (a
 * day of ₦50 stamp duties) pair up however the model ordered them.
 */
function categoryCheck(rows: Transaction[], labels: Label[]): Check {
  const pool = new Map<string, Transaction[]>()
  for (const row of rows) {
    pool.set(rowKey(row), [...(pool.get(rowKey(row)) ?? []), row])
  }

  let correct = 0
  const wrong: Label[] = []
  for (const item of labels) {
    const candidates = pool.get(rowKey(item)) ?? []
    const index = candidates.findIndex((row) => row.category === item.category)
    if (index < 0) wrong.push(item)
    else {
      candidates.splice(index, 1)
      correct += 1
    }
  }

  let notFound = 0
  const mistakes = new Map<string, number>()
  for (const item of wrong) {
    const row = pool.get(rowKey(item))?.shift()
    if (!row) {
      notFound += 1
      continue
    }
    const mistake = `${item.category} read as ${row.category}`
    mistakes.set(mistake, (mistakes.get(mistake) ?? 0) + 1)
  }

  const scored = labels.length - notFound
  const accuracy = scored ? correct / scored : 0
  const summary = [
    `${(accuracy * 100).toFixed(1)}% of ${scored} labeled rows (target ${CATEGORY_TARGET * 100}%)`,
    notFound ? `${notFound} labeled rows weren't extracted` : "",
  ]
    .filter(Boolean)
    .join(", ")
  const listed = [...mistakes]
    .sort((a, b) => b[1] - a[1])
    .map(([mistake, count]) => `${count}× ${mistake}`)
  return {
    name: "categories",
    pass: scored > 0 && accuracy >= CATEGORY_TARGET,
    detail: listed.length
      ? `${summary}\n      ${list(listed, "\n      ")}`
      : summary,
  }
}

/** An evenly spaced sample of rows to label, unless the file already exists. */
async function writeLabelTemplate(base: string, rows: Transaction[]) {
  const file = path.join(DIR, `${base}.labels.csv`)
  const exists = await readFile(file).then(
    () => true,
    () => false
  )
  if (exists) {
    console.log(`  · kept the existing ${base}.labels.csv`)
    return
  }

  const step = Math.max(1, rows.length / LABEL_SAMPLE)
  const sample = Array.from(
    { length: Math.min(LABEL_SAMPLE, rows.length) },
    (_, index) => rows[Math.floor(index * step)]
  )
  const lines = sample.map((row) =>
    toCsvRow([
      row.date,
      row.type,
      row.amount,
      row.merchant,
      row.description,
      row.category,
      "",
    ])
  )
  await writeFile(
    file,
    [toCsvRow([...LABEL_COLUMNS]), ...lines].join("\n") + "\n"
  )
  console.log(
    `  · wrote ${base}.labels.csv: fill in "category" (one of ${CATEGORIES.join(", ")})`
  )
}

async function readLabels(base: string): Promise<Label[] | undefined> {
  const file = `${base}.labels.csv`
  const text = await readFile(path.join(DIR, file), "utf8").catch(
    () => undefined
  )
  if (text === undefined) return undefined

  const [header = [], ...lines] = parseCsv(text)
  const labels = lines.flatMap((cells): Label[] => {
    const cell = (column: (typeof LABEL_COLUMNS)[number]) =>
      (cells[header.indexOf(column)] ?? "").trim()
    const category = CATEGORIES.find(
      (item) => item.toLowerCase() === cell("category").toLowerCase()
    )
    if (!category) {
      if (cell("category"))
        console.warn(`  ! unknown category "${cell("category")}" in ${file}`)
      return []
    }
    return [
      {
        date: cell("date"),
        type: cell("type") === "credit" ? "credit" : "debit",
        amount: Number(cell("amount")),
        merchant: cell("merchant"),
        category,
      },
    ]
  })
  return labels.length ? labels : undefined
}

function rowKey(row: Pick<Transaction, "date" | "type" | "amount">) {
  return `${row.date.slice(0, 10)}|${row.type}|${row.amount.toFixed(2)}`
}

async function readExpected(base: string): Promise<Expected> {
  try {
    return JSON.parse(
      await readFile(path.join(DIR, `${base}.expected.json`), "utf8")
    ) as Expected
  } catch {
    return {}
  }
}

function total(rows: Transaction[], type: Transaction["type"]) {
  return rows
    .filter((row) => row.type === type)
    .reduce((sum, row) => sum + row.amount, 0)
}

function signed(row: Transaction) {
  return row.type === "credit" ? row.amount : -row.amount
}

function near(a: number, b: number) {
  return Math.abs(a - b) < 0.01
}

function money(value: number) {
  return value.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function list(items: string[], separator = ", ") {
  const shown = items.slice(0, MAX_LISTED).join(separator)
  return items.length > MAX_LISTED
    ? `${shown}${separator}…and ${items.length - MAX_LISTED} more`
    : shown
}
