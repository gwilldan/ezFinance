import {
  DeviceReport,
  ReportNotFound,
  ReportView,
} from "@/components/report/report-page"
import { getCloudReport } from "@/lib/reports/server"
import { isReportId, reportStorageOf } from "@/lib/reports/types"
import { getSessionUser } from "@/lib/supabase/server"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Report · ezFinance" }

/**
 * One saved statement. The storage setting decides where to look first;
 * the other place is checked too, so reports saved before a switch still open.
 */
export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect("/")

  const { id } = await params
  if (!isReportId(id)) return <ReportNotFound />

  const storage = reportStorageOf(user.user_metadata)
  if (storage === "cloud") {
    const saved = await getCloudReport(user.id, id)
    if (saved)
      return <ReportView saved={saved} storage="cloud" userId={user.id} />
  }

  return (
    <DeviceReport userId={user.id} id={id} checkCloud={storage === "local"} />
  )
}
