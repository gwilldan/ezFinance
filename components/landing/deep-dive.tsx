import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { AssistantCard, BalanceCard, CategoryCard } from "./product-cards"
import { Reveal } from "./reveal"
import { Eyebrow, SectionTitle } from "./section"

const ROWS: { title: string; body: string; card: ReactNode }[] = [
  {
    title: "Know where you stood, every day.",
    body: "Follow your closing balance day by day, week by week or month by month, and spot the moments money moved.",
    card: <BalanceCard />,
  },
  {
    title: "See where your money went.",
    body: "Every transaction is sorted into a category with its own color, so the pattern behind your spending is obvious at a glance.",
    card: <CategoryCard />,
  },
  {
    title: "Ask your statement anything.",
    body: "“What did I spend the most on?” “What were my five biggest transfers?” The assistant answers from your actual transactions.",
    card: <AssistantCard />,
  },
]

export function DeepDive() {
  return (
    <section className="bg-ink px-6 py-24 text-ink-foreground lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-3xl">
          <Eyebrow tone="dark">Inside your report</Eyebrow>
          <SectionTitle className="mt-6">
            See your money the way your bank never showed it.
          </SectionTitle>
        </Reveal>

        <div className="mt-20 space-y-20 lg:space-y-28">
          {ROWS.map(({ title, body, card }, index) => (
            <Reveal
              key={title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20"
            >
              <div
                aria-hidden
                className={cn(
                  "rounded-[2rem] border border-white/10 bg-[radial-gradient(90%_90%_at_30%_20%,color-mix(in_oklch,var(--cyan-accent)_35%,transparent)_0%,transparent_70%)] p-8 sm:p-12",
                  index % 2 === 1 && "lg:order-2"
                )}
              >
                <div className="mx-auto max-w-sm">{card}</div>
              </div>
              <div>
                <h3 className="font-serif text-3xl leading-[1.15] tracking-[-0.01em] text-balance sm:text-4xl">
                  {title}
                </h3>
                <p className="mt-4 max-w-md text-lg leading-8 text-pretty text-ink-muted">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
