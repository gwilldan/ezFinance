import { getSessionUser } from "@/lib/supabase/server"
import { Nav } from "./home-nav"
import { UserNav } from "./user-nav"

/** The signed-in nav when there's a session, the marketing nav otherwise. */
export async function SiteNav() {
  const user = await getSessionUser()
  return user ? <UserNav user={user} /> : <Nav />
}
