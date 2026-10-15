import { UserNav } from "@/components/nav/user-nav"
import { SettingsPage } from "@/components/settings/settings-page"
import { getUsageSummary } from "@/lib/billing/usage"
import { reportStorageOf } from "@/lib/reports/types"
import { getSessionUser } from "@/lib/supabase/server"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Settings",
  // Private to the signed-in user.
  robots: { index: false, follow: false },
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect("/")

  return (
    <>
      <UserNav user={user} />
      <SettingsPage
        userId={user.id}
        email={user.email ?? ""}
        usage={await getUsageSummary(user.id)}
        // Back from Bachs checkout; the webhook may still be on its way.
        checkoutSucceeded={(await searchParams).checkout === "success"}
        // Opted in unless the user has turned it off.
        emailTips={user.user_metadata.email_tips !== false}
        reportStorage={reportStorageOf(user.user_metadata)}
      />
    </>
  )
}
