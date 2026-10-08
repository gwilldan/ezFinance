import { SiteNav } from "@/components/nav/site-nav"
import { PricingPage } from "@/components/pricing/pricing-page"
import { JsonLd, pricingJsonLd } from "@/components/seo/json-ld"
import { formatPrice, PRICING } from "@/lib/pricing"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing",
  description: `Start free with your first bank statement report. Pay ${formatPrice(PRICING.oneTimeReport.price)} for a one-time report, or choose Pro or Business for monthly statement analysis and AI questions.`,
  alternates: { canonical: "/pricing" },
  // Child openGraph/twitter objects replace the root's, so restate the basics.
  openGraph: {
    type: "website",
    siteName: "ezFinance",
    url: "/pricing",
    title: "Pricing · ezFinance",
  },
  twitter: { card: "summary_large_image", title: "Pricing · ezFinance" },
}

export default function Page() {
  return (
    <>
      <JsonLd data={pricingJsonLd} />
      <SiteNav />
      <PricingPage />
    </>
  )
}
