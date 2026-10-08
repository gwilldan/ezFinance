import type { ChatMessage } from "@/lib/bank-statement/chat"
import type { StatementReport } from "@/lib/bank-statement/schema"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { decryptJson, encryptJson } from "./crypto"
import {
  isReportId,
  summarize,
  type ReportSummary,
  type SavedReport,
} from "./types"

/**
 * Statements saved to the cloud. Every row is scoped to its owner and the
 * report, its summary and its chat are encrypted before they leave the server.
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
      generated_at: report.generatedAt,
      summary: encryptJson(summarize({ id, report }, "cloud")),
      report: encryptJson(report),
      messages: encryptJson([]),
    })
  if (error) throw new Error(`Couldn't save the report: ${error.message}`)
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

export async function listCloudReports(
  userId: string
): Promise<ReportSummary[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from(TABLE)
    .select("id, summary")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .returns<Pick<ReportRow, "id" | "summary">[]>()
  if (error) throw new Error(`Report history failed: ${error.message}`)

  return (data ?? []).map((row) => decryptJson<ReportSummary>(row.summary))
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
    .eq("id", id)
  if (error) throw new Error(`Couldn't save the chat: ${error.message}`)
}

export async function deleteCloudReports(userId: string) {
  const { error } = await createSupabaseAdminClient()
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
  if (error) throw new Error(`Couldn't delete reports: ${error.message}`)
}
