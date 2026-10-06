import { FAQS, PLANS, type Plan } from "@/lib/plans"
import { Check, ChevronDown, ShieldCheck } from "lucide-react"
import Link from "next/link"

export function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-6 pt-36 pb-24 text-foreground lg:px-10">
      <section className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-accent/20 bg-cyan-accent-soft/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-cyan-accent shadow-[0_0_12px_var(--cyan-accent)]" />
          Pricing
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-6xl">
          Simple pricing for clearer finances.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-pretty text-muted-foreground">
          Three plans plus a one-time report unlock. No hidden fees. Cancel
          anytime.
        </p>
      </section>

      <section className="mx-auto mt-16 grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </section>

      <p className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-cyan-accent" />
        Statements are read in memory and never stored.
      </p>

      <section className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-center text-3xl font-semibold tracking-[-0.04em]">
          Frequently asked questions
        </h2>
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </main>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const highlighted = plan.highlighted

  return (
    <article
      className={`relative flex flex-col rounded-3xl border p-7 ${highlighted ? "border-cyan-accent bg-card shadow-xl shadow-cyan-accent/15" : "border-border bg-card shadow-sm"}`}
    >
      {highlighted ? (
        <span className="absolute -top-3 left-7 rounded-full bg-cyan-accent px-3 py-1 text-xs font-medium text-cyan-accent-foreground">
          Most popular
        </span>
      ) : null}

      <h2 className="text-lg font-semibold">{plan.name}</h2>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">
        {plan.description}
      </p>

      <p className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-[-0.04em]">
          {plan.price}
        </span>
        {plan.period ? (
          <span className="text-sm text-muted-foreground">{plan.period}</span>
        ) : null}
      </p>
      <p className="mt-1 h-5 text-xs text-muted-foreground">{plan.annual}</p>

      <Link
        href={plan.cta.href}
        className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-medium transition-colors ${highlighted ? "bg-cyan-accent text-cyan-accent-foreground shadow-sm shadow-cyan-accent/25 hover:bg-cyan-accent/85" : "border border-border hover:bg-muted"}`}
      >
        {plan.cta.label}
      </Link>

      <ul className="mt-7 space-y-3 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <Check className="mt-0.5 size-4 shrink-0 text-cyan-accent" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
