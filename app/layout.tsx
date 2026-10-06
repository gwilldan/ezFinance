import type { Metadata } from "next"
import { Inter, Instrument_Serif } from "next/font/google"
import "./globals.css"
import Footer from "@/components/footer"

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" })
// Display serif for editorial headlines. It ships one weight (400) plus italic.
const fontSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "ezFinance — Your money, finally making sense",
  description:
    "ezFinance turns bank statements, everyday spending and tax season into one calm, clear picture.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontSerif.variable} antialiased`}
    >
      <body>
        {children}
        <Footer />
      </body>
    </html>
  )
}
