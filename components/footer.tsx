import { CONTACT_EMAIL, waitlistHref } from "@/lib/plans"
import { ArrowUpRight, Wallet } from "lucide-react"
import Link from "next/link"

/** A footer entry: a link, or (without href) an upcoming product shown faintly. */
type FooterItem = { label: string; href?: string }

const COLUMNS: { title: string; links: FooterItem[] }[] = [
  {
    title: "Products",
    links: [
      { label: "Statement Analyzer", href: "/#products" },
      { label: "Expense Tracker" },
      { label: "Tax Filing" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "ezFinance",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Privacy", href: "/#security" },
      { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-ink px-6 text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-14 pt-20 pb-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-cyan-accent text-cyan-accent-foreground">
              <Wallet className="size-4" aria-hidden />
            </span>
            ezFinance
          </Link>
          <p className="mt-5 max-w-sm leading-7 text-pretty text-ink-muted">
            Personal finance, made clear. Understand your statements today;
            track spending and file taxes next.
          </p>

          <p className="mt-12 font-serif text-3xl leading-[1.15]">
            Stay in the loop.
          </p>
          <a
            href={waitlistHref("updates")}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
          >
            Get product updates <ArrowUpRight className="size-4" />
          </a>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm text-ink-muted">{column.title}</h2>
              <ul className="mt-5 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link
                        href={link.href}
                        className="underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-ink-muted">
                        {link.label}
                        <span className="rounded-full border border-white/15 px-1.5 py-px text-[0.625rem] tracking-[0.05em] uppercase">
                          Soon
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-white/10 py-8 text-xs text-ink-muted sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} ezFinance. All rights reserved.</p>
        <p>Private by design. Statements are never stored.</p>
      </div>
    </footer>
  )
}
