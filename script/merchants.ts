/**
 * Checks lib/bank-statement/merchants.csv and helps grow it.
 *
 *   npm run merchants                      # check every row; exits 1 on problems
 *   npm run merchants -- "BUYPOWER NG LTD" # what a narration matches
 *   npm run merchants -- --unmatched       # the most common counterparties in
 *                                          # script/statements/*.out.json that
 *                                          # nothing matches yet
 *
 * --unmatched reads the rows `npm run eval -- --dump` writes, so dump first.
 */
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import {
  applyMerchantCatalog,
  MERCHANTS_FILE,
  parseMerchants,
} from "@/lib/bank-statement/merchants"
import type { Transaction } from "@/lib/bank-statement/schema"

const STATEMENTS = path.resolve("script/statements")
const MAX_UNMATCHED = 40

const args = process.argv.slice(2)
const { entries, problems } = parseMerchants(
  await readFile(MERCHANTS_FILE, "utf8")
)

if (problems.length) {
  console.error(`✗ ${problems.length} problems in ${MERCHANTS_FILE}`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

const patterns = entries.reduce((sum, entry) => sum + entry.patterns.length, 0)
console.log(`✓ ${entries.length} entries, ${patterns} patterns`)
console.table(countBy(entries.map((entry) => entry.category ?? "(bank)")))

if (args.includes("--unmatched")) await listUnmatched()

for (const text of args.filter((arg) => !arg.startsWith("--"))) {
  for (const type of ["debit", "credit"] as const) {
    const before: Transaction = {
      date: "",
      description: text,
      merchant: text,
      amount: 1,
      type,
      category: "Other",
      bank: text,
    }
    const { transactions, matched } = applyMerchantCatalog([before])
    const [after] = transactions
    console.log(
      `"${text}" as ${type}: ${
        matched ? `${after.category}, named "${after.merchant}"` : "no match"
      }${after.bank !== text ? `; as a bank, "${after.bank}"` : ""}`
    )
  }
}

async function listUnmatched() {
  const dumps = (await readdir(STATEMENTS)).filter((file) =>
    file.endsWith(".out.json")
  )
  if (!dumps.length) {
    console.log("No dumps yet. Run `npm run eval -- --dump` first.")
    return
  }

  const rows: Transaction[] = []
  for (const file of dumps) {
    const dump = JSON.parse(
      await readFile(path.join(STATEMENTS, file), "utf8")
    ) as { transactions: Transaction[] }
    rows.push(...dump.transactions.filter((row) => row.type === "debit"))
  }

  const unmatched = rows.filter((row) => !applyMerchantCatalog([row]).matched)
  const groups = new Map<
    string,
    { count: number; total: number; categories: Set<string> }
  >()
  for (const row of unmatched) {
    const key = row.merchant.trim().toLowerCase()
    const group = groups.get(key) ?? {
      count: 0,
      total: 0,
      categories: new Set(),
    }
    group.count += 1
    group.total += row.amount
    group.categories.add(row.category)
    groups.set(key, group)
  }

  console.log(
    `\n${unmatched.length} of ${rows.length} debits match nothing (${percent(unmatched.length / rows.length)}). Most common:`
  )
  console.table(
    [...groups]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, MAX_UNMATCHED)
      .map(([merchant, group]) => ({
        merchant,
        rows: group.count,
        total: Math.round(group.total),
        "model said": [...group.categories].join(", "),
      }))
  )
  console.log("People are expected here; add the businesses, billers and fees.")
}

function countBy(values: string[]) {
  const counts: Record<string, number> = {}
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1
  return counts
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}
