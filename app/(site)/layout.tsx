import Footer from "@/components/footer"

/** Pages that carry the site footer. The report page (/result) sits outside. */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
