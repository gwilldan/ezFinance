import { statementOrder } from "./analyze"
import type { Transaction } from "./schema"

const MONTH_DAYS = 31
// Longest stretch of balances that lost their minus sign that gets restored.
const MAX_SIGN_RUN = 60
// Most same-day rows reordered at one break in the balance chain.
const MAX_REORDER = 10
// Most rows in a row whose balances are rebuilt from their amounts.
const MAX_MISREAD = 3
// Longest stretch of invented balances (a fixed amount off) that gets shifted.
const MAX_OFFSET_RUN = 200

export type ReconcileStats = {
  datesFixed: number
  swapsFixed: number
  reordered: number
  offsetsFixed: number
  overdraftsFixed: number
  balancesCorrected: number
  directionsFixed: number
  balancesFilled: number
  missingBalances: number
}

/**
 * The statement's running balance is the ground truth. Bank labels such as
 * "inward transfer" on a stamp-duty charge mislead the model, so:
 * 0. dates misread as MM/DD (an outlier among its neighbours) are fixed,
 * 1. rows where the model swapped amount and balance are swapped back,
 * 2. same-day rows printed out of balance order are put back in order,
 * 3. overdrawn rows are repaired: a dropped minus sign on the balance, or the
 *    balance copied into the amount,
 * 4. a stretch of balances the model invented (a fixed amount off) is
 *    shifted back, and a few misread balances are rebuilt from their
 *    amounts when only one reading fits between their neighbours,
 * 5. each row's direction is taken from its balance change, and
 * 6. missing balances are filled only when the amounts add up exactly
 *    between two known balances.
 */
export function reconcileBalances(transactions: Transaction[]): {
  transactions: Transaction[]
  stats: ReconcileStats
} {
  // Dates first: one misread date at either end would flip the detected order.
  const dated = transactions.map((row) => ({ ...row }))
  const datesFixed = fixDates(dated)
  const order = statementOrder(dated)
  const rows = order.oldestFirst
  const stats = {
    datesFixed,
    swapsFixed: fixSwaps(rows),
    reordered: fixOrder(rows),
    offsetsFixed: fixOffsetRuns(rows),
    overdraftsFixed: fixOverdrafts(rows),
    balancesCorrected: 0,
    directionsFixed: 0,
    balancesFilled: 0,
    missingBalances: 0,
  }

  stats.balancesCorrected = fixMisreadBalances(rows)
  stats.directionsFixed += fixDirections(rows)

  for (let start = 0; start < rows.length; start += 1) {
    if (rows[start].balance !== undefined) continue
    let end = start
    while (end < rows.length && rows[end].balance === undefined) end += 1

    const before = rows[start - 1]?.balance
    const after = rows[end]
    if (before !== undefined && after) {
      const filled = fillGap(rows.slice(start, end), before, after)
      filled?.forEach((row, offset) => {
        if (row.type !== rows[start + offset].type) stats.directionsFixed += 1
        rows[start + offset] = row
      })
      stats.balancesFilled += filled?.length ?? 0
    }
    start = end
  }

  // Rows right after a filled gap can only be checked now.
  stats.directionsFixed += fixDirections(rows)
  stats.missingBalances = rows.filter((row) => row.balance === undefined).length
  return { transactions: order.restore(rows), stats }
}

/**
 * A row whose date sits outside its neighbours but fits once day and month
 * are swapped was a DD/MM date read as MM/DD (or the reverse). Decisions use
 * the original dates so one bad row can't cascade into its neighbours.
 */
function fixDates(rows: Transaction[]): number {
  const dates = rows.map((row) => row.date)
  let fixed = 0
  dates.forEach((date, index) => {
    const swapped = swapDayMonth(date)
    const range = expectedRange(dates, index)
    if (swapped && range && !within(date, range) && within(swapped, range)) {
      rows[index] = { ...rows[index], date: swapped }
      fixed += 1
    }
  })
  return fixed
}

/**
 * Between its two neighbours; at either end, within a month of the next two
 * rows, and only when those two agree with each other.
 */
function expectedRange(dates: string[], index: number) {
  const previous = dates[index - 1]
  const next = dates[index + 1]
  if (previous && next) return [previous, next].sort()

  const [a, b] = previous
    ? [previous, dates[index - 2]]
    : [next, dates[index + 2]]
  // `!(gap <= …)` also rejects unparseable dates (NaN).
  const gap = a && b ? Math.abs(toDay(a) - toDay(b)) : Number.NaN
  if (!(gap <= MONTH_DAYS)) return undefined
  const [low, high] = [a, b].sort()
  return [shiftDays(low, -MONTH_DAYS), shiftDays(high, MONTH_DAYS)]
}

function within(date: string, [low, high]: string[]) {
  return date >= low && date <= high
}

function toDay(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000
}

function shiftDays(date: string, days: number) {
  return new Date((toDay(date) + days) * 86_400_000).toISOString().slice(0, 10)
}

function swapDayMonth(date: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match || Number(match[3]) > 12) return undefined
  return `${match[1]}-${match[3]}-${match[2]}`
}

/** Swaps amount and balance back when only the swapped values chain. */
function fixSwaps(rows: Transaction[]): number {
  let fixed = 0
  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    const { amount, balance } = rows[i]
    const next = rows[i + 1]
    if (previous === undefined || balance === undefined) continue

    const chains = (rowAmount: number, rowBalance: number) =>
      sameAmount(Math.abs(rowBalance - previous), rowAmount) &&
      (next?.balance === undefined ||
        sameAmount(Math.abs(next.balance - rowBalance), next.amount))

    if (!chains(amount, balance) && chains(balance, amount)) {
      rows[i] = { ...rows[i], amount: balance, balance: amount }
      fixed += 1
    }
  }
  return fixed
}

/** Rows whose balance doesn't follow from the row before, after reconciling. */
export function chainBreaks(transactions: Transaction[]): number {
  const rows = statementOrder(
    reconcileBalances(transactions).transactions
  ).oldestFirst
  return rows.filter((row, i) => {
    const previous = rows[i - 1]?.balance
    return previous !== undefined && row.balance !== undefined
      ? !chains(previous, row)
      : false
  }).length
}

/**
 * Some banks print rows from the same second (a transfer, its VAT and stamp
 * duty) in any order, though the balances apply them in one order. Where
 * the chain breaks, the next few same-day rows are put in the order whose
 * balances chain, from the row before through to the row after.
 */
function fixOrder(rows: Transaction[]): number {
  let fixed = 0
  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    if (previous === undefined || chains(previous, rows[i])) continue

    const day = rows[i].date.slice(0, 10)
    for (let size = 2; size <= MAX_REORDER; size += 1) {
      const group = rows.slice(i, i + size)
      if (
        group.length < size ||
        group.some((row) => row.date.slice(0, 10) !== day)
      ) {
        break
      }
      const order = chainOrder(group, previous)
      const next = rows[i + size]
      const last = order?.at(-1)?.balance
      if (
        order &&
        last !== undefined &&
        (next?.balance === undefined || chains(last, next))
      ) {
        rows.splice(i, size, ...order)
        fixed += 1
        i += size - 1
        break
      }
    }
  }
  return fixed
}

/** An order of `group` in which every balance chains from `start`. */
function chainOrder(
  group: Transaction[],
  start: number
): Transaction[] | undefined {
  if (!group.length) return []
  for (const [index, row] of group.entries()) {
    if (!chains(start, row)) continue
    const rest = chainOrder(group.toSpliced(index, 1), row.balance!)
    if (rest) return [row, ...rest]
  }
  return undefined
}

/**
 * Misread balances on up to MAX_MISREAD rows in a row: their balances are
 * rebuilt from the row before using their amounts, and kept only when
 * exactly one choice of directions leads into the row after.
 */
function fixMisreadBalances(rows: Transaction[]): number {
  let fixed = 0
  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    if (previous === undefined || chains(previous, rows[i])) continue

    for (let size = 1; size <= MAX_MISREAD; size += 1) {
      const next = rows[i + size]
      if (next?.balance === undefined) break
      const group = rows.slice(i, i + size)
      if (group.some((row) => row.balance === undefined)) break

      const fits = directionChoices(size)
        .map((signs) => {
          let balance = previous
          return group.map((row, index) => {
            balance = round(balance + signs[index] * row.amount)
            return { ...row, balance }
          })
        })
        .filter((rebuilt) => chains(rebuilt.at(-1)!.balance!, next))
      if (fits.length === 1) {
        rows.splice(i, size, ...fits[0])
        fixed += size
        i += size - 1
        break
      }
      if (fits.length > 1) break
    }
  }
  return fixed
}

/** Every combination of +1 (money in) and -1 (money out) for `size` rows. */
function directionChoices(size: number): number[][] {
  return Array.from({ length: 2 ** size }, (_, bits) =>
    Array.from({ length: size }, (_, index) => ((bits >> index) & 1 ? 1 : -1))
  )
}

/**
 * The model sometimes invents one balance and then calculates the rest from
 * it, leaving a stretch of rows that chain with each other but sit a fixed
 * amount off. The offset is measured where the stretch starts and the
 * stretch is shifted back, only once a later row confirms it: it chains from
 * the shifted balance, or its amount is a copied balance and its own
 * balance leads on.
 */
function fixOffsetRuns(rows: Transaction[]): number {
  let fixed = 0
  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    const row = rows[i]
    if (previous === undefined || row.balance === undefined) continue
    if (chains(previous, row) || copiedBalance(row)) continue
    // The offset is measured from the row before, so it must be confirmed.
    const before = rows[i - 2]?.balance
    if (before !== undefined && !chains(before, rows[i - 1])) continue

    const expected = previous + signed(row)
    const offset = round(row.balance - expected)
    const end = offsetRunEnd(rows, i, offset)
    if (end === undefined) continue

    for (let j = i; j <= end; j += 1) {
      rows[j] = { ...rows[j], balance: round(rows[j].balance! - offset) }
    }
    fixed += end - i + 1
    i = end
  }
  return fixed
}

function offsetRunEnd(rows: Transaction[], start: number, offset: number) {
  if (offset === 0) return undefined
  for (let end = start; end < start + MAX_OFFSET_RUN; end += 1) {
    const balance = rows[end]?.balance
    const next = rows[end + 1]
    if (balance === undefined || next?.balance === undefined) return undefined
    if (chains(balance, next)) continue
    if (chains(balance - offset, next)) return end
    if (copiedBalance(next) && chains(next.balance, rows[end + 2] ?? next))
      return end
    return undefined
  }
  return undefined
}

/**
 * Overdrawn balances ("-₦2,908.76", "2,908.76 DR") trip the model in two ways.
 * 1. It drops the minus sign, often on several rows in a row. Flipping a run
 *    of balances keeps the changes inside it, so a run is made negative only
 *    when that mends both the break into it and the break out of it.
 * 2. It copies the balance into the amount. The amount is then the balance
 *    change, when that leads into the next row.
 */
function fixOverdrafts(rows: Transaction[]): number {
  let fixed = 0

  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    if (previous === undefined || rows[i].balance === undefined) continue
    if (chains(previous, rows[i])) continue

    const end = signRunEnd(rows, i, previous)
    if (end === undefined) continue
    for (let j = i; j <= end; j += 1) {
      rows[j] = { ...rows[j], balance: -rows[j].balance! }
    }
    fixed += end - i + 1
    i = end
  }

  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    const row = rows[i]
    if (previous === undefined || row.balance === undefined) continue
    if (chains(previous, row) || !copiedBalance(row)) continue

    const repaired = { ...row, amount: round(Math.abs(row.balance - previous)) }
    if (repaired.amount > 0 && leadsInto(row.balance, rows[i + 1])) {
      rows[i] = repaired
      fixed += 1
    }
  }
  return fixed
}

/**
 * The last row of the shortest run of positive balances starting at `start`
 * that reads right once negative: it chains from `previous`, and the row
 * after it chains from the run or shows a printed (so trusted) minus sign.
 * A row whose amount is a copied balance can't chain, so it's let through.
 */
function signRunEnd(rows: Transaction[], start: number, previous: number) {
  const first = rows[start]
  const entry =
    chains(previous, { ...first, balance: -first.balance! }) ||
    copiedBalance(first)
  if (!entry) return undefined

  for (let end = start; end < start + MAX_SIGN_RUN; end += 1) {
    const balance = rows[end]?.balance
    // The model drops minus signs but doesn't add them.
    if (balance === undefined || balance <= 0) return undefined
    const next = rows[end + 1]
    if (next?.balance === undefined) return undefined
    if (chains(-balance, next) || (next.balance < 0 && copiedBalance(next)))
      return end
  }
  return undefined
}

/** The amount is the size of the row's own balance, as when it was copied. */
function copiedBalance(row: Transaction) {
  return (
    row.balance !== undefined && sameAmount(row.amount, Math.abs(row.balance))
  )
}

/** The next row chains from `balance`, or its own amount is a copied balance. */
function leadsInto(balance: number, next: Transaction | undefined) {
  if (next?.balance === undefined) return true
  return chains(balance, next) || copiedBalance(next)
}

/** The row's amount, in either direction, explains its balance change. */
function chains(previous: number, row: Transaction) {
  return (
    row.balance !== undefined &&
    sameAmount(Math.abs(row.balance - previous), row.amount)
  )
}

/** Sets each row's direction from its balance change; returns rows changed. */
function fixDirections(rows: Transaction[]): number {
  let fixed = 0
  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1].balance
    const row = rows[i]
    if (previous === undefined || row.balance === undefined) continue

    const delta = row.balance - previous
    if (!sameAmount(Math.abs(delta), row.amount)) continue

    const type = delta > 0 ? "credit" : "debit"
    if (row.type !== type) {
      rows[i] = withType(row, type)
      fixed += 1
    }
  }
  return fixed
}

/**
 * Balances for rows between two known balances, if their amounts add up.
 * Also tries flipping one row's direction, which catches a single misread
 * refund or fee inside the gap.
 */
function fillGap(
  gap: Transaction[],
  before: number,
  after: Transaction
): Transaction[] | undefined {
  const candidates = [
    gap,
    ...gap.map((row, index) =>
      gap.map((item, i) =>
        i === index
          ? withType(row, row.type === "credit" ? "debit" : "credit")
          : item
      )
    ),
  ]

  for (const candidate of candidates) {
    let running = before
    const filled = candidate.map((row) => {
      running += signed(row)
      return { ...row, balance: round(running) }
    })
    if (sameAmount(running + signed(after), after.balance!)) return filled
  }
  return undefined
}

function withType(row: Transaction, type: Transaction["type"]): Transaction {
  // Income only makes sense on money in.
  const category =
    type === "debit" && row.category === "Income" ? "Other" : row.category
  return { ...row, type, category }
}

function signed(row: Transaction) {
  return row.type === "credit" ? row.amount : -row.amount
}

function sameAmount(a: number, b: number) {
  return Math.abs(a - b) < 0.005
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
