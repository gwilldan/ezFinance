import { Eyebrow, SectionTitle } from "@/components/landing/section"
import { CONTACT_EMAIL, FAQS, PLANS, type Plan } from "@/lib/plans"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Check, ChevronDown } from "lucide-react"
import Link from "next/link"

const PROMISES = [
  "Your first analysis is free",
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
        <div className="mt-12 divide-y divide-border rounded-[2rem] border border-border/70 bg-card">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group px-7 py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 max-w-2xl leading-7 text-pretty text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
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
        "relative grid gap-8 rounded-[2rem] border p-7 sm:grid-cols-[0.9fr_1.1fr] sm:p-8",
        highlighted
          ? "border-cyan-accent bg-[linear-gradient(135deg,color-mix(in_oklch,var(--cyan-accent)_9%,white),white_60%)] shadow-xl shadow-cyan-accent/10"
          : "border-border/70 bg-card"
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

      <div className="flex flex-col">
        <h2 className="font-medium">{plan.name}</h2>
        <p className="mt-3 flex items-baseline gap-1">
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
        <Link
          href={plan.cta.href}
          className={cn(
            "mt-6 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:ring-offset-2 focus-visible:outline-none",
            highlighted
              ? "bg-cyan-accent text-cyan-accent-foreground hover:bg-cyan-accent/85"
              : "border border-border bg-card hover:bg-muted"
          )}
        >
          {plan.cta.label}
        </Link>
      </div>

      <ul className="space-y-3 text-sm sm:border-l sm:border-border/70 sm:pl-8">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <Check
              className="mt-0.5 size-4 shrink-0 text-cyan-accent"
              aria-hidden
            />
            <span className="leading-6 text-pretty">{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
