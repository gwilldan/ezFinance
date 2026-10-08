import { renderOgCard } from "@/lib/og-card"
import { formatPrice, PRICING } from "@/lib/pricing"

export const alt =
  "ezFinance pricing: start free, upgrade when it earns its place"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** The card shown when the pricing page is shared. */
export default function PricingOpenGraphImage() {
  return renderOgCard({
    headline: ["Simple pricing.", "Start free."],
    description:
      "Three plans plus a one-time report unlock. Upgrade only when it earns its place.",
    points: [
      "First report free",
      `${formatPrice(PRICING.oneTimeReport.price)} one-time report`,
      `Pro from ${formatPrice(PRICING.pro.monthly)}/month`,
    ],
  })
}
