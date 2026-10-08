import Analyzer from "@/components/analyzer/analyzer"
import { Home } from "@/components/home"
import { Nav } from "@/components/nav/home-nav"
import { UserNav } from "@/components/nav/user-nav"
import { getUsageSummary } from "@/lib/billing/usage"
import { listReportHistory } from "@/lib/reports/server"
import { getSessionUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>
}) {
  // Supabase sends sign-ins here when the callback URL isn't on its redirect
  // allowlist; finish them so the session is still saved.
  const { code } = await searchParams
  if (typeof code === "string" && code) {
    redirect(`/api/auth/callback?code=${encodeURIComponent(code)}`)
  }

  const user = await getSessionUser()

  if (user?.id) {
    return (
      <>
        <UserNav user={user} />
        <Analyzer
          userId={user.id}
          usage={await getUsageSummary(user.id)}
          // Matched against this device's reports in the browser.
          history={await listReportHistory(user.id).catch((error) => {
            console.error("Report history failed", error)
            return []
          })}
        />
      </>
    )
  }

  return (
    <>
      <Nav />
      <Home />
    </>
  )
}
