import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "ezFinance — Your money, finally making sense",
  description:
    "ezFinance AI turns bank statements, everyday spending and tax season into one calm, clear picture.",
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
      <body>{children}</body>
    </html>
  )
}
