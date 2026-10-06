import { SiteNav } from "@/components/nav/site-nav"
import { PricingPage } from "@/components/pricing/pricing-page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing · ezFinance",
  description: "Simple pricing for ezFinance bank statement analysis.",
}

export default function Page() {
  return (
    <>
      <SiteNav />
      <PricingPage />
    </>
  )
}
