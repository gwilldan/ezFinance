import { cookies } from "next/headers"
import Analyzer from "@/components/analyzer/analyzer"
import { Home } from "@/components/home"
import { getUserByAccessToken } from "@/lib/supabase/server"

export default async function Page() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("ezfinance-access-token")?.value ?? null

  const user = await getUserByAccessToken(accessToken)

  if (user && (user as any).id) {
    return <Analyzer />
  }

  return <Home />
}
