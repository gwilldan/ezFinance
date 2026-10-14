import { readFileSync } from "node:fs"
import path from "node:path"
import { parseCsv } from "@/lib/csv"
import { CATEGORIES, type Category, type Transaction } from "./schema"

/*
 * Known merchants, billers, fees and banks, from merchants.csv. The model's
 * category is a guess from the narration ("buy power" reads like Shopping);
 * a match here replaces it, so known names always land in the same place.
 *
 * Columns:
 *   patterns     what to look for, "|"-separated, e.g. "ikeja electric|ikedc"
 *   name         the clean display name
 *   category     the category it sets; empty for banks
 *   kind         merchant, biller or fee: renames the counterparty and sets
 *                the category. fee renames even when only the narration
 *                matches, since a fee has no other counterparty.
 *                keyword: a generic word ("pharmacy"); sets the category only.
 *                bank: a bank or wallet; only cleans up the bank name and
 *                never decides the category, since the money only passed
 *                through it.
 *   direction    debit or credit to apply to one side only; empty for both
 *   description  a note for whoever edits the file
 */

export const MERCHANTS_FILE = path.join(
  process.cwd(),
  "lib/bank-statement/merchants.csv"
)
const COLUMNS = [
  "patterns",
  "name",
  "category",
  "kind",
  "direction",
  "description",
] as const
const KINDS = ["merchant", "biller", "fee", "keyword", "bank"] as const
const MIN_PATTERN = 3

type Kind = (typeof KINDS)[number]
export type MerchantEntry = {
  line: number
  patterns: string[]
  name: string
  category?: Category
  kind: Kind
  direction?: Transaction["type"]
  description: string
}
type Pattern = { words: string; compact: string; entry: MerchantEntry }
type Catalog = { categorizers: Pattern[]; banks: Pattern[] }

/** Parses the file and lists every row that breaks a rule. */
export function parseMerchants(csv: string): {
  entries: MerchantEntry[]
  problems: string[]
} {
  const [header = [], ...rows] = parseCsv(csv)
  const problems: string[] = []
  const missing = COLUMNS.filter((column) => !header.includes(column))
  if (missing.length) {
    return { entries: [], problems: [`missing columns: ${missing.join(", ")}`] }
  }

  const entries: MerchantEntry[] = []
  rows.forEach((cells, index) => {
    const line = index + 2
    const cell = (column: (typeof COLUMNS)[number]) =>
      (cells[header.indexOf(column)] ?? "").trim()
    if (cells.every((value) => !value.trim())) return

    const rowProblems: string[] = []
    const patterns = cell("patterns").split("|").map(words).filter(Boolean)
    const name = cell("name")
    const kind = KINDS.find((item) => item === cell("kind"))
    const category = CATEGORIES.find((item) => item === cell("category"))
    const direction = cell("direction")

    if (!patterns.length) rowProblems.push("no patterns")
    for (const pattern of patterns) {
      if (pattern.length < MIN_PATTERN)
        rowProblems.push(`pattern "${pattern}" is shorter than ${MIN_PATTERN}`)
    }
    if (!name) rowProblems.push("no name")
    if (!kind) rowProblems.push(`unknown kind "${cell("kind")}"`)
    if (cell("category") && !category)
      rowProblems.push(`unknown category "${cell("category")}"`)
    if (kind === "bank" && cell("category"))
      rowProblems.push("banks can't set a category")
    if (kind && kind !== "bank" && !category) rowProblems.push("no category")
    if (direction && direction !== "debit" && direction !== "credit")
      rowProblems.push(`direction must be debit, credit or empty`)

    if (rowProblems.length) {
      problems.push(...rowProblems.map((problem) => `line ${line}: ${problem}`))
      return
    }
    entries.push({
      line,
      patterns,
      name,
      category,
      kind: kind!,
      direction: direction ? (direction as Transaction["type"]) : undefined,
      description: cell("description"),
    })
  })

  // Banks are matched apart from everything else, so only clash within a side.
  for (const banks of [true, false]) {
    const seen = new Map<string, number>()
    for (const entry of entries.filter(
      (item) => (item.kind === "bank") === banks
    )) {
      for (const pattern of entry.patterns) {
        const first = seen.get(pattern)
        if (first) {
          problems.push(
            `line ${entry.line}: pattern "${pattern}" is already on line ${first}`
          )
        } else seen.set(pattern, entry.line)
      }
    }
  }
  return { entries, problems }
}

let catalog: Catalog | undefined

/** The parsed file, read once per server. Broken rows are skipped and logged. */
function loadCatalog(): Catalog {
  if (catalog) return catalog
  const { entries, problems } = parseMerchants(
    readFileSync(MERCHANTS_FILE, "utf8")
  )
  if (problems.length) {
    console.warn("[merchants] skipped rows:", problems)
  }
  const compile = (list: MerchantEntry[]) =>
    list
      .flatMap((entry) =>
        entry.patterns.map((pattern) => ({
          words: pattern,
          compact: pattern.replaceAll(" ", ""),
          entry,
        }))
      )
      // Named entries before generic keywords, then the longest pattern:
      // "phed" before "electricity", "amazon prime" before "amazon".
      .sort(
        (a, b) =>
          Number(a.entry.kind === "keyword") -
            Number(b.entry.kind === "keyword") ||
          b.compact.length - a.compact.length
      )

  catalog = {
    categorizers: compile(entries.filter((entry) => entry.kind !== "bank")),
    banks: compile(entries.filter((entry) => entry.kind === "bank")),
  }
  return catalog
}

/**
 * Applies the catalog to extracted rows: known names get their category and a
 * clean name, and bank names are made consistent ("Paycom(Opay)" → "Opay").
 * Rows with no match keep the model's category.
 */
export function applyMerchantCatalog(transactions: Transaction[]): {
  transactions: Transaction[]
  matched: number
} {
  const { categorizers, banks } = loadCatalog()
  let matched = 0

  const result = transactions.map((row) => {
    const bankEntry = row.bank ? findMatch(row.bank, banks) : undefined
    const bank = bankEntry?.name ?? row.bank
    const fits = (entry: MerchantEntry) =>
      !entry.direction || entry.direction === row.type

    const inMerchant = findMatch(row.merchant, categorizers, fits)
    const entry = inMerchant ?? findMatch(row.description, categorizers, fits)
    const next = { ...row, ...(bank ? { bank } : {}) }
    if (!entry?.category) return next

    matched += 1
    const rename =
      entry.kind === "fee" || (inMerchant && entry.kind !== "keyword")
    return {
      ...next,
      category: entry.category,
      ...(rename ? { merchant: entry.name } : {}),
      // A fee is charged by the statement's own bank; the account and bank in
      // its narration belong to the transfer it was charged on.
      ...(entry.kind === "fee" ? { account: undefined, bank: undefined } : {}),
    }
  })
  return { transactions: result, matched }
}

/**
 * A pattern matches whole words, either as written or with the spaces between
 * words ignored: "buy power" matches "BUYPOWER" and "Paycom(Opa y)" matches
 * "paycom opay". It never matches part of a word, so "hospital" doesn't
 * match "hospitality".
 */
function findMatch(
  text: string,
  patterns: Pattern[],
  fits: (entry: MerchantEntry) => boolean = () => true
): MerchantEntry | undefined {
  const spaced = ` ${words(text)} `
  const list = spaced.trim().split(" ")
  return patterns.find(
    ({ words: pattern, compact, entry }) =>
      fits(entry) && (spaced.includes(` ${pattern} `) || joinsTo(list, compact))
  )?.entry
}

/** Whether consecutive words, joined without spaces, spell `target`. */
function joinsTo(list: string[], target: string): boolean {
  for (let start = 0; start < list.length; start += 1) {
    let joined = ""
    for (let end = start; end < list.length; end += 1) {
      joined += list[end]
      if (joined === target) return true
      if (joined.length >= target.length) break
    }
  }
  return false
}

/**
 * Lowercase words without punctuation, with numbers split from letters:
 * "Paycom(Opay)" → "paycom opay", "100MB plan" → "100 mb plan".
 */
function words(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)/g, " ")
    .trim()
}
