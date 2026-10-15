import { UserNav } from "@/components/nav/user-nav"
import { SettingsPage } from "@/components/settings/settings-page"
import { isCheckoutGranted } from "@/lib/billing/grant"
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect("/")

  // Back from Bachs with the checkout's ref; the webhook may still be on its
  // way. The ref only reveals whether that checkout went through.
  const { checkout: ref } = await searchParams
  const checkout =
    ref && UUID.test(ref)
      ? (await isCheckoutGranted(ref))
        ? "granted"
        : "pending"
      : null

  return (
    <>
      <UserNav user={user} />
      <SettingsPage
        userId={user.id}
        email={user.email ?? ""}
        usage={await getUsageSummary(user.id)}
        checkout={checkout}
        // Opted in unless the user has turned it off.
        emailTips={user.user_metadata.email_tips !== false}
        reportStorage={reportStorageOf(user.user_metadata)}
      />
    </>
  )
}
