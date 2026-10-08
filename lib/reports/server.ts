import type { ChatMessage } from "@/lib/bank-statement/chat"
import type { StatementReport } from "@/lib/bank-statement/schema"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { decryptJson, encryptJson } from "./crypto"
import {
  isReportId,
  summarize,
  type RecordedReport,
  type ReportStorage,
  type ReportSummary,
  type SavedReport,
} from "./types"

/**
 * Where every statement is kept, and the cloud statements themselves. Every
 * row is scoped to its owner. Cloud rows carry the report, its summary and its
 * chat, encrypted before they leave the server; device rows carry only the
 * location.
 */

type ReportRow = {
  id: string
  summary: string
  report: string
  messages: string
}

const TABLE = "statement_reports"

export async function saveCloudReport(
  userId: string,
  id: string,
  report: StatementReport
) {
  const { error } = await createSupabaseAdminClient()
    .from(TABLE)
    .insert({
      id,
      user_id: userId,
      storage: "cloud",
      generated_at: report.generatedAt,
      summary: encryptJson(summarize({ id, report }, "cloud")),
      report: encryptJson(report),
      messages: encryptJson([]),
    })
  if (error) throw new Error(`Couldn't save the report: ${error.message}`)
}

/** Records a report kept on the user's device: its location, never its data. */
export async function saveLocalReportLocation(
  userId: string,
  id: string,
  report: StatementReport
) {
  const { error } = await createSupabaseAdminClient().from(TABLE).insert({
    id,
    user_id: userId,
    storage: "local",
    generated_at: report.generatedAt,
  })
  if (error) throw new Error(`Couldn't save the report: ${error.message}`)
}

/**
 * Where a report was saved, or `null` when there's no record of it (device
 * reports saved before locations were recorded).
 */
export async function getReportStorage(
  userId: string,
  id: string
): Promise<ReportStorage | null> {
  if (!isReportId(id)) return null
  const { data, error } = await createSupabaseAdminClient()
    .from(TABLE)
    .select("storage")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle<{ storage: ReportStorage }>()
  if (error) throw new Error(`Report lookup failed: ${error.message}`)
  return data?.storage ?? null
}

export async function getCloudReport(
  userId: string,
  id: string
): Promise<SavedReport | null> {
  if (!isReportId(id)) return null
  const { data, error } = await createSupabaseAdminClient()
    .from(TABLE)
    .select("id, report, messages")
    .eq("user_id", userId)
    .eq("storage", "cloud")
    .eq("id", id)
    .maybeSingle<Omit<ReportRow, "summary">>()
  if (error) throw new Error(`Report lookup failed: ${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    report: decryptJson<StatementReport>(data.report),
    messages: decryptJson<ChatMessage[]>(data.messages),
  }
}

/**
 * Every report the user has made, newest first: cloud reports with their
 * summary, device reports with only their date (see RecordedReport).
 */
export async function listReportHistory(
  userId: string
): Promise<RecordedReport[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from(TABLE)
    .select("id, storage, generated_at, summary")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .returns<
      {
        id: string
        storage: ReportStorage
        generated_at: string
        summary: string | null
      }[]
    >()
  if (error) throw new Error(`Report history failed: ${error.message}`)

  return (data ?? []).map((row) =>
    row.storage === "cloud" && row.summary
      ? {
          id: row.id,
          generatedAt: row.generated_at,
          storage: "cloud",
          summary: decryptJson<ReportSummary>(row.summary),
        }
      : { id: row.id, generatedAt: row.generated_at, storage: "local" }
  )
}

export async function saveCloudMessages(
  userId: string,
  id: string,
  messages: ChatMessage[]
) {
  const { error } = await createSupabaseAdminClient()
    .from(TABLE)
    .update({ messages: encryptJson(messages), updated_at: new Date() })
    .eq("user_id", userId)
    .eq("storage", "cloud")
    .eq("id", id)
  if (error) throw new Error(`Couldn't save the chat: ${error.message}`)
}

/** Deletes the user's cloud reports and the location of every device report. */
export async function deleteReports(userId: string) {
  const { error } = await createSupabaseAdminClient()
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
  if (error) throw new Error(`Couldn't delete reports: ${error.message}`)
}
