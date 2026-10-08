import { Lato, Rethink_Sans, Space_Grotesk } from "next/font/google"

// Page-specific faces, loaded only where they're used (the site-wide ones are
// in app/layout.tsx).

/** The upload card's "Analyze a statement" heading. */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
})

/** Pricing headings, prices and labels (variable, 400–800). */
export const rethinkSans = Rethink_Sans({
  subsets: ["latin"],
  variable: "--font-rethink-sans",
  display: "swap",
})

/** Pricing body copy. Lato is static, so load every weight the page uses. */
export const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
})
