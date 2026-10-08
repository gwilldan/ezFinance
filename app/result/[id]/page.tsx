import {
  DeviceReport,
  ReportNotFound,
  ReportView,
} from "@/components/report/report-page"
import { getCloudReport, getReportStorage } from "@/lib/reports/server"
import { isReportId } from "@/lib/reports/types"
import { getSessionUser } from "@/lib/supabase/server"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Report",
  // Private to the signed-in user.
  robots: { index: false, follow: false },
}

/**
 * One saved statement, looked up where it was saved (not where the storage
 * setting points now). Device reports saved before locations were recorded
 * have no record: they're looked for on this device, then in the cloud.
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

  const storage = await getReportStorage(user.id, id)
  if (storage === "cloud") {
    const saved = await getCloudReport(user.id, id)
    if (!saved) return <ReportNotFound />
    return <ReportView saved={saved} storage="cloud" userId={user.id} />
  }

  return <DeviceReport userId={user.id} id={id} checkCloud={storage === null} />
}
