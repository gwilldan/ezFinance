import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/nav"
import Footer from "@/components/footer"

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "ezFinance — Financial clarity, made simple",
  description:
    "AI-powered financial planning and analytics for your personal and business finances.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  )
}
