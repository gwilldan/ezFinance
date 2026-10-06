/**
 * Runs the production extraction on every PDF in script/statements and checks
 * the result against the statement's own printed totals.
 *
 *   npm run eval                # every statement
 *   npm run eval -- kuda gtb    # only files whose name contains "kuda" or "gtb"
 *   npm run eval -- --dump      # also write <name>.out.json with the rows
 *
 * Expected totals sit next to each PDF as <name>.expected.json. Every field is
 * optional; copy them from the statement's summary section. "password" unlocks
 * a protected PDF (the file is git-ignored with the statements):
 *   { "currency": "NGN", "openingBalance": 0, "closingBalance": 0,
 *     "moneyIn": 0, "moneyOut": 0, "transactionCount": 0, "password": "" }
 */
import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { statementOrder } from "@/lib/bank-statement/analyze"
import { elapsed, extractTransactions } from "@/lib/bank-statement/extract"
import { PdfPasswordError, readPdfPages } from "@/lib/bank-statement/pdf"
import type { Transaction } from "@/lib/bank-statement/schema"

const DIR = path.resolve("script/statements")
const MAX_LISTED = 5

type Expected = {
  password?: string
  currency?: string
  openingBalance?: number
  closingBalance?: number
  moneyIn?: number
  moneyOut?: number
  transactionCount?: number
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
    const checks = [
      ...internalChecks(rows, expected.openingBalance),
      ...expectedChecks(rows, currency, expected),
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
