import { waitlistHref } from "@/lib/plans"
import { formatPrice, PRICING } from "@/lib/pricing"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { Reveal } from "./reveal"
import { SectionTitle } from "./section"

const { free, pro } = PRICING

/** Pricing teaser followed by the final call to action. */
export function Closing({ onStart }: { onStart: () => void }) {
  return (
    <section className="px-6 pb-24 lg:pb-32">
      <div className="mx-auto max-w-6xl space-y-4">
        <Reveal>
          <div className="flex flex-col gap-6 rounded-[2rem] border border-border/70 bg-card p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="font-serif text-3xl leading-[1.15] tracking-[-0.01em] text-balance">
                Start free. Upgrade when it earns its place.
              </h2>
              <p className="mt-2 text-muted-foreground">
                Your first{" "}
                {free.allowance.reports === 1
                  ? "report is"
                  : `${free.allowance.reports} reports are`}{" "}
                free. Pro is{" "}
                <span className="tabular-nums">
                  {formatPrice(pro.monthly)}/month
                </span>{" "}
                for {pro.allowance.reports} reports a month.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:outline-none sm:self-auto"
            >
              See pricing <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-cyan-accent px-8 py-20 text-center text-cyan-accent-foreground sm:px-16 lg:py-28">
            <div
              aria-hidden
              className="bg-dot-grid pointer-events-none absolute inset-0 [--dot-color:rgb(255_255_255/0.22)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.14),transparent_70%),radial-gradient(50%_60%_at_100%_100%,color-mix(in_oklch,var(--ink)_45%,transparent),transparent_70%)]"
            />
            <div className="relative">
              <SectionTitle>Begin with one statement.</SectionTitle>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-pretty text-white">
                Upload a PDF and see your money clearly in about twenty seconds.
                Expense tracking and tax filing are on the way.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onStart}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium whitespace-nowrap text-ink transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-accent focus-visible:outline-none"
                >
                  Analyze a statement <ArrowRight className="size-4" />
                </button>
                <a
                  href={waitlistHref("suite")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  Join the waitlist <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
