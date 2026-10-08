import { renderOgCard } from "@/lib/og-card"
import { SITE_DESCRIPTION } from "@/lib/site"

export const alt = "ezFinance: your money, finally making sense"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** The card shown when a link to the site is shared. */
export default function OpenGraphImage() {
  return renderOgCard({
    headline: ["Your money,", "finally making sense."],
    description: SITE_DESCRIPTION,
    points: [
      "AI bank statement analysis",
      "Private by default",
      "First report free",
    ],
  })
}
