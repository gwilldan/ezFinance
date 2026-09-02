import Analyzer from "@/components/analyzer/analyzer"
import { Home } from "@/components/home"
import { Nav } from "@/components/nav/home-nav"
import {UserNav} from "@/components/nav/user-nav"
import { getSessionUser } from "@/lib/supabase/server"

export default async function Page() {
  const user = await getSessionUser()

  if (user?.id) {
    return <>
      <UserNav user={user} />
      <Analyzer />
    </>
  }

  return <>
   <Nav />
   <Home />
  </>
}
