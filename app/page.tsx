import Analyzer from "@/components/analyzer/analyzer"
import { Home } from "@/components/home"
import { getSessionUser } from "@/lib/supabase/server"

export default async function Page() {
  const user = await getSessionUser()

  if (user?.id) {
    return <Analyzer />
  }

  return <Home />
}
