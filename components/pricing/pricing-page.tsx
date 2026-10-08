import { Eyebrow } from "@/components/landing/section"
import { lato, rethinkSans } from "@/lib/fonts"
import { CONTACT_EMAIL, FAQS, PLANS, type Plan } from "@/lib/plans"
import { PRICING } from "@/lib/pricing"
import { cn } from "@/lib/utils"
import { ArrowRight, ArrowUpRight, Check, Info } from "lucide-react"
import Link from "next/link"
import { FaqAccordion } from "./faq-accordion"

const freeReports = PRICING.free.allowance.reports

const PROMISES = [
  freeReports === 1
    ? "Your first report is free"
    : `Your first ${freeReports} reports are free`,
  "No hidden fees",
  "Cancel anytime",
  "Statements are never stored",
]

export function PricingPage() {
  return (
    <main
      className={cn(
        lato.variable,
        rethinkSans.variable,
        "bg-paper px-6 pt-36 pb-24 font-lato text-foreground lg:pt-44"
      )}
    >
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <section className="lg:sticky lg:top-36 lg:self-start">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-6 font-rethink text-4xl leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.5rem]">
            Choose the plan that fits your money.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-[1.7] text-pretty text-muted-foreground">
            Three plans plus a one-time report unlock. Start free and upgrade
            only when it earns its place.
          </p>

          <hr className="my-8 border-border" />

          <ul className="space-y-3.5 leading-[1.6]">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-3">
                <CheckBadge />
                {promise}
              </li>
            ))}
          </ul>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-rethink text-sm font-medium text-ink-foreground transition-colors hover:bg-ink/85 focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Questions? Talk to us <ArrowUpRight className="size-4" />
          </a>
        </section>

        <section aria-label="Plans" className="space-y-6">
          {PLANS.map((plan) => (
            <PlanRow key={plan.name} plan={plan} />
          ))}
        </section>
      </div>

      <section className="mx-auto mt-32 max-w-3xl">
        <h2 className="text-center font-rethink text-4xl leading-[1.1] font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
          Questions, answered.
        </h2>
        <div className="mt-12">
          <FaqAccordion items={FAQS} />
        </div>
      </section>
    </main>
  )
}

function PlanRow({ plan }: { plan: Plan }) {
  const highlighted = plan.highlighted

  return (
    <article
      className={cn(
        "group/plan relative grid gap-8 rounded-[2rem] border p-7 transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:grid-cols-[0.9fr_1.1fr] sm:p-8",
        highlighted
          ? "border-cyan-accent bg-[linear-gradient(135deg,color-mix(in_oklch,var(--cyan-accent)_9%,white),white_60%)] shadow-xl shadow-cyan-accent/10 hover:shadow-2xl hover:shadow-cyan-accent/15"
          : "border-border/70 bg-card hover:shadow-lg hover:shadow-ink/5"
      )}
    >
      <span
        className={cn(
          "absolute -top-3 right-7 rounded-full px-3 py-1 font-rethink text-xs font-semibold tracking-[0.02em] whitespace-nowrap",
          highlighted
            ? "bg-cyan-accent text-cyan-accent-foreground"
            : "bg-ink text-ink-foreground"
        )}
      >
        {plan.badge}
      </span>

      <div className="flex flex-col sm:col-start-1 sm:row-start-1">
        <h2 className="font-rethink text-lg leading-[1.3] font-semibold tracking-[-0.01em]">
          {plan.name}
        </h2>
        <Price price={plan.price} period={plan.period} />
        {plan.yearly ? (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs leading-[1.5] text-muted-foreground tabular-nums">
            <span className="rounded-full bg-cyan-accent-soft px-2 py-0.5 font-rethink font-semibold text-cyan-accent">
              Save {plan.yearly.saving}%
            </span>
            or {plan.yearly.price}/year
          </p>
        ) : null}
        <p className="mt-4 text-[0.9375rem] leading-[1.65] text-pretty text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <div className="flex flex-col gap-5 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:border-l sm:border-border/70 sm:pl-8">
        <ul className="space-y-3.5 text-[0.9375rem]">
          {[...plan.allowance, ...plan.features].map((feature) => (
            <li key={feature} className="flex gap-3">
              <CheckBadge className="mt-0.5" />
              <span className="leading-[1.6] text-pretty">{feature}</span>
            </li>
          ))}
        </ul>
        {plan.overage ? (
          <p className="mt-auto flex gap-2.5 rounded-2xl bg-muted/70 p-3.5 text-xs leading-[1.6] text-pretty text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {plan.overage}
          </p>
        ) : null}
      </div>

      <Link
        href={plan.cta.href}
        className={cn(
          "inline-flex w-fit items-center gap-2 self-end rounded-full px-5 py-2.5 font-rethink text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:ring-offset-2 focus-visible:outline-none sm:col-start-1 sm:row-start-2",
          highlighted
            ? "bg-cyan-accent text-cyan-accent-foreground hover:bg-cyan-accent/85"
            : "border border-border bg-card hover:bg-muted"
        )}
      >
        {plan.cta.label}
        <ArrowRight
          className="size-4 transition-transform group-hover/plan:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </Link>
    </article>
  )
}

/** A price with its currency symbol set smaller, so the figure leads. */
function Price({ price, period }: { price: string; period?: string }) {
  const [, symbol = "", amount = price] = price.match(/^(\D*)(.*)$/) ?? []

  return (
    <p className="mt-5 flex items-baseline gap-1.5 font-rethink">
      <span className="flex items-start text-5xl leading-none font-semibold tracking-[-0.045em] tabular-nums">
        {symbol ? (
          <span className="mt-1 mr-0.5 text-2xl font-medium tracking-normal text-muted-foreground">
            {symbol}
          </span>
        ) : null}
        {amount}
      </span>
      {period ? (
        <span className="text-sm font-medium text-muted-foreground">
          {period}
        </span>
      ) : null}
    </p>
  )
}

function CheckBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full bg-cyan-accent-soft text-cyan-accent",
        className
      )}
      aria-hidden
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  )
}
