import { CalendarClock, FileStack, TrendingDown } from "lucide-react"
import { Reveal } from "./reveal"
import { Eyebrow, SectionTitle } from "./section"

const PROBLEMS = [
  {
    icon: FileStack,
    title: "Statements nobody reads",
    body: "Twelve pages of codes, transfers and fees. The answers are in there, buried under the noise.",
  },
  {
    icon: TrendingDown,
    title: "Spending that slips by",
    body: "A transfer here, a subscription there. By month end, the balance tells you something went wrong, not what.",
  },
  {
    icon: CalendarClock,
    title: "Tax season panic",
    body: "Once a year, you dig through it all again to work out what you earned and what you owe.",
  },
]

export function Problem() {
  return (
    <section id="story" className="scroll-mt-28 px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <Eyebrow>The problem</Eyebrow>
            <SectionTitle className="mt-6">
              Money gets noisy.
              <span className="block text-muted-foreground italic">
                Clarity shouldn’t be hard.
              </span>
            </SectionTitle>
          </div>
          <p className="max-w-md text-lg leading-8 text-pretty text-muted-foreground">
            Most of us only look closely at our money when something has already
            gone wrong. ezFinance was built to make looking easy.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map(({ icon: Icon, title, body }, index) => (
            <Reveal key={title} delay={index * 120}>
              <article className="h-full rounded-3xl border border-border/70 bg-card/70 p-7">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-serif text-2xl text-muted-foreground tabular-nums">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-lg font-semibold tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="mt-2 leading-7 text-pretty text-muted-foreground">
                  {body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
