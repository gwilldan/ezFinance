/**
 * Load-tests POST /api/upload on a running server with the PDFs in
 * script/statements, and checks each report against its expected totals.
 *
 *   npm run loadtest                              # 20 uploads/min for 3 min
 *   npm run loadtest -- --rate 40 --minutes 5     # heavier
 *   npm run loadtest -- --url https://preview-url.vercel.app
 *   npm run loadtest -- --only kuda --out loadtest.json --verbose
 *
 * Every minute a wave of --rate uploads starts at once, cycling through the
 * statements (with "password" from <name>.expected.json where set). Waves
 * don't wait for the one before, as real users wouldn't.
 *
 * Signs in with LOADTEST_EMAIL and LOADTEST_PASSWORD from .env. Each upload
 * spends a report, so use a test account on Business, which never runs out:
 *   npm run grant -- <email> business
 *
 * The server retries DashScope 429s quietly, so a run can pass while the
 * rate limit is already being hit. Start the server with OPENAI_LOG=info to
 * see them: OPENAI_LOG=info npm start
 */
import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { parseArgs } from "node:util"
import type { UploadEvent } from "@/lib/reports/types"

const DIR = path.resolve("script/statements")
// Past the route's 300s maxDuration, so only a hung connection hits this.
const CLIENT_TIMEOUT_MS = 500_000
const WAVE_GAP_MS = 60_000
const PROBE_EVERY_MS = 2_000
const PROGRESS_EVERY_MS = 15_000

const { values: options } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    rate: { type: "string", default: "20" },
    minutes: { type: "string", default: "3" },
    only: { type: "string", multiple: true, default: [] },
    out: { type: "string" },
    verbose: { type: "boolean", default: false },
  },
})

const BASE = options.url.replace(/\/$/, "")
const RATE = positiveInt(options.rate, "--rate")
const WAVES = positiveInt(options.minutes, "--minutes")

type Expected = { password?: string; moneyIn?: number; moneyOut?: number }
type Statement = { file: string; bytes: Buffer; expected: Expected }
type Result = {
  id: string
  wave: number
  file: string
  startedAt: number
  ms: number
  status: number
  rows?: number
  totalsOk?: boolean
  error?: string
  /** Longest gap between streamed events; pings should keep it near 10s. */
  maxSilenceMs?: number
}
type Probe = { at: number; ms: number; status: number; inFlight: number }

const startedAt = Date.now()
const since = () => Date.now() - startedAt

const log = {
  info: (message: string) => write("INFO ", message),
  warn: (message: string) => write("WARN ", message),
  error: (message: string) => write("ERROR", message),
  debug: (message: string) => options.verbose && write("DEBUG", message),
}

function write(level: string, message: string) {
  const time = new Date().toISOString().slice(11, 23)
  const offset = `+${seconds(since())}`.padStart(7)
  const line = `${time} ${offset} ${level} ${message}`
  if (level.trim() === "ERROR") console.error(line)
  else console.log(line)
}

const statements = await loadStatements()
const cookie = await signIn()

let inFlight = 0
let peakInFlight = 0
const results: Result[] = []
const probes: Probe[] = []

log.info(
  `Target ${BASE}: ${RATE} uploads/min for ${WAVES} min (${RATE * WAVES} total) over ${statements.length} statement(s)`
)

const probeTimer = setInterval(probeServer, PROBE_EVERY_MS)
const progressTimer = setInterval(logProgress, PROGRESS_EVERY_MS)

const waves: Promise<Result[]>[] = []
for (let wave = 1; wave <= WAVES; wave += 1) {
  const startAt = (wave - 1) * WAVE_GAP_MS
  if (since() < startAt) await sleep(startAt - since())
  log.info(
    `Wave ${wave}/${WAVES}: starting ${RATE} uploads (${inFlight} still in flight)`
  )
  waves.push(runWave(wave))
}
await Promise.all(waves)

clearInterval(probeTimer)
clearInterval(progressTimer)
report()

if (options.out) {
  await writeFile(
    options.out,
    JSON.stringify({ options, results, probes }, null, 2)
  )
  log.info(`Wrote every result to ${options.out}`)
}
process.exit(results.every(passed) ? 0 : 1)

async function runWave(wave: number) {
  const waveStart = since()
  const uploads = Array.from({ length: RATE }, (_, index) =>
    upload(wave, statements[((wave - 1) * RATE + index) % statements.length])
  )
  const done = await Promise.all(uploads)
  const failed = done.filter((result) => !passed(result)).length
  const times = done.map((result) => result.ms)
  log.info(
    `Wave ${wave} done in ${seconds(since() - waveStart)}: ${done.length - failed}/${done.length} ok, p50 ${seconds(percentile(times, 50))}, max ${seconds(Math.max(...times))}`
  )
  return done
}

async function upload(wave: number, statement: Statement): Promise<Result> {
  const id = `w${wave}#${String(results.length + inFlight + 1).padStart(3, "0")}`
  const form = new FormData()
  form.append(
    "file",
    new Blob([new Uint8Array(statement.bytes)], { type: "application/pdf" }),
    statement.file
  )
  if (statement.expected.password) {
    form.append("password", statement.expected.password)
  }

  const result: Result = {
    id,
    wave,
    file: statement.file,
    startedAt: since(),
    ms: 0,
    status: 0,
  }
  inFlight += 1
  peakInFlight = Math.max(peakInFlight, inFlight)
  log.debug(`${id} start  ${statement.file} (${inFlight} in flight)`)

  try {
    const response = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { cookie },
      body: form,
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    })
    result.status = response.status
    const body = response.headers
      .get("content-type")
      ?.startsWith("application/x-ndjson")
      ? await readStream(response, result)
      : ((await response.json().catch(() => ({}))) as UploadBody)
    if (response.ok && !body.error) {
      const rows = body.report?.transactions
      result.rows = rows?.length
      // Cloud-storage accounts get no report back, so only the status counts.
      if (rows) result.totalsOk = totalsMatch(rows, statement.expected)
    } else {
      result.error = body.error ?? response.statusText
    }
  } catch (error) {
    result.error =
      error instanceof Error && error.name === "TimeoutError"
        ? `no response after ${seconds(CLIENT_TIMEOUT_MS)}`
        : error instanceof Error
          ? error.message
          : String(error)
  } finally {
    inFlight -= 1
    result.ms = since() - result.startedAt
  }

  results.push(result)
  const silence =
    result.maxSilenceMs === undefined
      ? ""
      : `, longest silence ${seconds(result.maxSilenceMs)}`
  const summary = `${id} ${statement.file} → ${result.status || "—"} in ${seconds(result.ms)}${silence}`
  if (result.error) log.error(`${summary}: ${result.error}`)
  else if (result.totalsOk === false)
    log.warn(`${summary}: ${result.rows} rows, totals don't match`)
  else log.info(`${summary}: ${result.rows ?? "?"} rows`)
  return result
}

/**
 * Reads the upload's streamed events (newline-delimited JSON) until its
 * result or error, timing the gaps between them.
 */
async function readStream(response: Response, result: Result) {
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
  let buffered = ""
  let last = since()
  result.maxSilenceMs = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    result.maxSilenceMs = Math.max(result.maxSilenceMs, since() - last)
    last = since()
    buffered += value
    const lines = buffered.split("\n")
    buffered = lines.pop() ?? ""
    for (const line of lines.filter((item) => item.trim())) {
      const event = JSON.parse(line) as UploadEvent
      if (event.type === "progress") {
        log.debug(`${result.id} progress ${event.done}/${event.total}`)
      }
      if (event.type === "result") return event as UploadBody
      if (event.type === "error") return { error: event.error }
    }
  }
  return { error: "stream ended without a result" }
}

/** A cheap authenticated route; slow answers mean the server is busy. */
async function probeServer() {
  const at = since()
  const response = await fetch(`${BASE}/api/usage`, {
    headers: { cookie },
    signal: AbortSignal.timeout(PROGRESS_EVERY_MS),
  }).catch(() => null)
  const probe = {
    at,
    ms: since() - at,
    status: response?.status ?? 0,
    inFlight,
  }
  probes.push(probe)
  if (probe.ms > 3_000 || probe.status !== 200) {
    log.warn(
      `Server slow to answer /api/usage: ${probe.status || "no response"} in ${seconds(probe.ms)} with ${inFlight} uploads in flight`
    )
  }
}

function logProgress() {
  const failed = results.filter((result) => !passed(result)).length
  log.info(
    `Progress: ${results.length}/${RATE * WAVES} done, ${failed} failed, ${inFlight} in flight`
  )
}

function report() {
  const ok = results.filter(passed)
  const times = results.map((result) => result.ms)
  const probeTimes = probes.map((probe) => probe.ms)

  console.log("\nBy statement")
  console.table(
    statements.map(({ file }) => {
      const mine = results.filter((result) => result.file === file)
      const ms = mine.map((result) => result.ms)
      return {
        file,
        uploads: mine.length,
        ok: mine.filter(passed).length,
        p50: seconds(percentile(ms, 50)),
        p90: seconds(percentile(ms, 90)),
        max: seconds(Math.max(...ms)),
      }
    })
  )

  const errors = Map.groupBy(
    results.filter((result) => !passed(result)),
    (result) =>
      result.error
        ? `${result.status || "—"} ${result.error}`
        : `${result.status} totals don't match`
  )
  if (errors.size) {
    console.log("\nFailures")
    console.table(
      [...errors].map(([error, items]) => ({ error, count: items.length }))
    )
  }

  console.log("\nSummary")
  console.table({
    uploads: results.length,
    succeeded: ok.length,
    failed: results.length - ok.length,
    "p50 / p90 / p99": [50, 90, 99]
      .map((p) => seconds(percentile(times, p)))
      .join(" / "),
    slowest: seconds(Math.max(...times)),
    "peak in flight": peakInFlight,
    "longest silence": seconds(
      Math.max(0, ...results.map((result) => result.maxSilenceMs ?? 0))
    ),
    "probe p50 / max": `${seconds(percentile(probeTimes, 50))} / ${seconds(Math.max(...probeTimes))}`,
    "wall clock": seconds(since()),
  })
  if (results.length === ok.length) log.info("All uploads succeeded")
  else log.error(`${results.length - ok.length} upload(s) failed`)
}

async function loadStatements(): Promise<Statement[]> {
  const files = (await readdir(DIR))
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .filter(
      (file) =>
        !options.only.length || options.only.some((name) => file.includes(name))
    )
    .sort()
  if (!files.length) fail(`No matching PDFs in ${DIR}`)

  return Promise.all(
    files.map(async (file) => {
      const base = file.replace(/\.pdf$/i, "")
      const expected = await readFile(
        path.join(DIR, `${base}.expected.json`),
        "utf8"
      )
        .then((text) => JSON.parse(text) as Expected)
        .catch(() => ({}))
      return { file, bytes: await readFile(path.join(DIR, file)), expected }
    })
  )
}

/** Signs in like the browser and returns the session cookies. */
async function signIn() {
  const email = process.env.LOADTEST_EMAIL
  const password = process.env.LOADTEST_PASSWORD
  if (!email || !password) {
    fail("Set LOADTEST_EMAIL and LOADTEST_PASSWORD in .env")
  }

  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch((error: Error) => fail(`Can't reach ${BASE}: ${error.message}`))
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as UploadBody
    fail(`Sign-in failed (${response.status}): ${body.error ?? "no details"}`)
  }
  log.info(`Signed in as ${email}`)
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ")
}

type UploadBody = {
  error?: string
  report?: { transactions?: { type: string; amount: number }[] }
}

function totalsMatch(
  rows: { type: string; amount: number }[],
  expected: Expected
) {
  const total = (type: string) =>
    rows
      .filter((row) => row.type === type)
      .reduce((sum, row) => sum + row.amount, 0)
  return (
    near(total("credit"), expected.moneyIn) &&
    near(total("debit"), expected.moneyOut)
  )
}

function passed(result: Result) {
  return result.status === 200 && result.totalsOk !== false
}

function near(actual: number, expected?: number) {
  return expected === undefined || Math.abs(actual - expected) < 0.01
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b)
  return (
    sorted[
      Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
    ] ?? 0
  )
}

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`
}

function positiveInt(value: string, name: string) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1) {
    fail(`${name} must be a whole number of at least 1`)
  }
  return number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fail(message: string): never {
  log.error(message)
  process.exit(1)
}
