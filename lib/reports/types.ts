import type { ChatMessage } from "@/lib/bank-statement/chat"
import type { StatementReport } from "@/lib/bank-statement/schema"

/** Where a user keeps their analyzed statements. */
export type ReportStorage = "local" | "cloud"

/** One analyzed statement with the chat that belongs to it. */
export type SavedReport = {
  id: string
  report: StatementReport
  messages: ChatMessage[]
}

/** What the history list shows for a saved statement. */
export type ReportSummary = {
  id: string
  fileName: string
  statementPeriod: string
  transactionCount: number
  generatedAt: string
  storage: ReportStorage
}

/**
 * One row of the user's report history as the server knows it. Cloud reports
 * carry their summary; device reports carry only when they were made, since
 * their contents never leave the device that saved them.
 */
export type RecordedReport =
  | {
      id: string
      generatedAt: string
      storage: "cloud"
      summary: ReportSummary
    }
  | { id: string; generatedAt: string; storage: "local" }

/** Most chat messages kept with a statement. */
export const MAX_SAVED_MESSAGES = 200

/** Device storage unless the user has chosen the cloud. */
export function reportStorageOf(metadata: Record<string, unknown> | undefined) {
  return metadata?.report_storage === "cloud" ? "cloud" : "local"
}

export function summarize(
  { id, report }: Pick<SavedReport, "id" | "report">,
  storage: ReportStorage
): ReportSummary {
  return {
    id,
    fileName: report.fileName,
    statementPeriod: report.statementPeriod,
    transactionCount: report.transactions.length,
    generatedAt: report.generatedAt,
    storage,
  }
}

export function isReportId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

/** Keeps well-formed messages only, newest last. */
export function toMessages(value: unknown, limit = MAX_SAVED_MESSAGES) {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is ChatMessage =>
        (item?.role === "user" || item?.role === "assistant") &&
        typeof item.content === "string"
    )
    .slice(-limit)
    .map(({ role, content }) => ({ role, content }))
}
