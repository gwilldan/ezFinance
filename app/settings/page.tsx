import { UserNav } from "@/components/nav/user-nav"
import { SettingsPage } from "@/components/settings/settings-page"
import { getSessionUser } from "@/lib/supabase/server"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Settings · ezFinance" }

export default async function Page() {
  const user = await getSessionUser()
  if (!user) redirect("/")

  return (
    <>
      <UserNav user={user} />
      <SettingsPage
        email={user.email ?? ""}
        // Opted in unless the user has turned it off.
        emailTips={user.user_metadata.email_tips !== false}
      />
    </>
  )
}
