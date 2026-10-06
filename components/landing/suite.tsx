import { waitlistHref } from "@/lib/plans"
import { cn } from "@/lib/utils"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"
import {
  AssistantCard,
  BalanceCard,
  CategoryCard,
  ExpenseCard,
  TaxCard,
} from "./product-cards"
import { Reveal } from "./reveal"
import { Eyebrow, SectionTitle, primaryButton } from "./section"

export function Suite({ onStart }: { onStart: () => void }) {
  return (
    <section id="products" className="scroll-mt-28 px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>The ezFinance suite</Eyebrow>
          <SectionTitle className="mt-6">
            One calm home for every money question.
          </SectionTitle>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-pretty text-muted-foreground">
            Start by understanding what already happened. Next, keep track as it
            happens. Then, file with confidence.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
          <Reveal className="lg:col-span-2 lg:row-span-2">
            <ProductCard
              status="live"
              name="Statement Analyzer"
              description="Upload a PDF bank statement and get a categorized report, balance chart, recurring charges and an assistant that answers questions about your account."
              action={
                <button
                  type="button"
                  onClick={onStart}
                  className={primaryButton}
                >
                  Analyze a statement <ArrowRight className="size-4" />
                </button>
              }
              dark
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <BalanceCard className="sm:col-span-2" />
                <CategoryCard />
                <AssistantCard />
              </div>
            </ProductCard>
          </Reveal>

          <Reveal delay={120}>
            <ProductCard
              status="soon"
              name="Expense Tracker"
              description="Budgets that keep up with you, with a nudge before a category runs out."
              action={<WaitlistLink product="Expense Tracker" />}
            >
              <ExpenseCard />
            </ProductCard>
          </Reveal>

          <Reveal delay={240}>
            <ProductCard
              status="soon"
              name="Tax Filing"
              description="Your statements become a ready-to-review return. Income, reliefs and the paperwork, gathered for you."
              action={<WaitlistLink product="Tax Filing" />}
            >
              <TaxCard />
            </ProductCard>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function ProductCard({
  status,
  name,
  description,
  action,
  children,
  dark = false,
}: {
  status: "live" | "soon"
  name: string
  description: string
  action: ReactNode
  children: ReactNode
  dark?: boolean
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col gap-8 overflow-hidden rounded-[2rem] border p-7 sm:p-9",
        dark
          ? "border-transparent bg-ink text-ink-foreground"
          : "border-border/70 bg-card"
      )}
    >
      <div>
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
            status === "live"
              ? "bg-cyan-accent text-cyan-accent-foreground"
              : "border border-border text-muted-foreground"
          )}
        >
          {status === "live" ? "Live now" : "Coming soon"}
        </span>
        <h3 className="mt-5 font-serif text-3xl leading-[1.15] tracking-[-0.01em] sm:text-4xl">
          {name}
        </h3>
        <p
          className={cn(
            "mt-3 max-w-lg leading-7 text-pretty",
            dark ? "text-ink-muted" : "text-muted-foreground"
          )}
        >
          {description}
        </p>
        <div className="mt-6">{action}</div>
      </div>
      <div aria-hidden className="mt-auto">
        {children}
      </div>
    </article>
  )
}

function WaitlistLink({ product }: { product: string }) {
  return (
    <a
      href={waitlistHref(product)}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-accent underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:outline-none"
    >
      Join the waitlist <ArrowUpRight className="size-4" />
    </a>
  )
}
