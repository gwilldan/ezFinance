import Footer from "@/components/footer"
import { getSessionUser } from "@/lib/supabase/server"

/**
 * Pages that carry the site footer, shown only to signed-out visitors.
 * The report page (/result) sits outside.
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser()

  return (
    <>
      {children}
      {user ? null : <Footer />}
    </>
  )
}
