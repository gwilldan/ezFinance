import { Eyebrow, SectionTitle } from "@/components/landing/section"
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
    <main className="bg-paper px-6 pt-36 pb-24 text-foreground lg:pt-44">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <section className="lg:sticky lg:top-36 lg:self-start">
          <Eyebrow>Pricing</Eyebrow>
          <SectionTitle as="h1" className="mt-6">
            Choose the plan that fits your money.
          </SectionTitle>
          <p className="mt-6 max-w-md text-lg leading-8 text-pretty text-muted-foreground">
            Three plans plus a one-time report unlock. Start free and upgrade
            only when it earns its place.
          </p>

          <hr className="my-8 border-border" />

          <ul className="space-y-3">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-3">
                <Check className="size-4 text-cyan-accent" aria-hidden />
                {promise}
              </li>
            ))}
          </ul>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink/85 focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:ring-offset-2 focus-visible:outline-none"
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
        <SectionTitle className="text-center">
          Questions, answered.
        </SectionTitle>
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
          "absolute -top-3 right-7 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
          highlighted
            ? "bg-cyan-accent text-cyan-accent-foreground"
            : "bg-ink text-ink-foreground"
        )}
      >
        {plan.badge}
      </span>

      <div className="flex flex-col sm:col-start-1 sm:row-start-1">
        <h2 className="font-medium">{plan.name}</h2>
        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="font-serif text-5xl leading-none tracking-[-0.02em] tabular-nums">
            {plan.price}
          </span>
          {plan.period ? (
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          ) : null}
        </p>
        {plan.annual ? (
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            {plan.annual}
          </p>
        ) : null}
        <p className="mt-3 text-sm leading-6 text-pretty text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <div className="flex flex-col gap-5 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:border-l sm:border-border/70 sm:pl-8">
        <ul className="space-y-3 text-sm">
          {[...plan.allowance, ...plan.features].map((feature) => (
            <li key={feature} className="flex gap-3">
              <Check
                className="mt-0.5 size-4 shrink-0 text-cyan-accent"
                aria-hidden
              />
              <span className="leading-6 text-pretty">{feature}</span>
            </li>
          ))}
        </ul>
        {plan.overage ? (
          <p className="mt-auto flex gap-2.5 rounded-2xl bg-muted/70 p-3.5 text-xs leading-5 text-pretty text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {plan.overage}
          </p>
        ) : null}
      </div>

      <Link
        href={plan.cta.href}
        className={cn(
          "inline-flex w-fit items-center gap-2 self-end rounded-full px-5 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:ring-offset-2 focus-visible:outline-none sm:col-start-1 sm:row-start-2",
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
