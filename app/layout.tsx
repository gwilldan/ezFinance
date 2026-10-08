import { JsonLd, siteJsonLd } from "@/components/seo/json-ld"
import {
  BRAND_COLOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site"
import type { Metadata, Viewport } from "next"
import { Gabarito, Inter, Instrument_Serif } from "next/font/google"
import "./globals.css"

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" })
// Display serif for editorial headlines. It ships one weight (400) plus italic.
const fontSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
})
// Geometric display face for the hero (a free stand-in for GT Walsheim).
const fontDisplay = Gabarito({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
})

// Icons, the manifest and the social images come from the file conventions
// in this folder (icon.tsx, apple-icon.tsx, manifest.ts, opengraph-image.tsx).
export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: `${SITE_NAME}: ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  category: "finance",
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontDisplay.variable} antialiased`}
    >
      <body>
        <JsonLd data={siteJsonLd} />
        {children}
      </body>
    </html>
  )
}
