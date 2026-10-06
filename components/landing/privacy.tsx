import { BadgeCheck, KeyRound, ShieldCheck } from "lucide-react"
import { Reveal } from "./reveal"
import { Eyebrow, SectionTitle } from "./section"

const PROMISES = [
  {
    icon: ShieldCheck,
    title: "Read, never kept",
    body: "Your PDF is read in memory to build the report, then discarded. We don’t store your statements.",
  },
  {
    icon: KeyRound,
    title: "Passwords stay yours",
    body: "A statement password unlocks that one file for that one analysis. It’s never saved or logged.",
  },
  {
    icon: BadgeCheck,
    title: "Numbers you can trust",
    body: "Every row is checked against your statement’s running balance, so totals match what your bank says.",
  },
]

export function Privacy() {
  return (
    <section id="security" className="scroll-mt-28 px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <Eyebrow>Private by design</Eyebrow>
          <SectionTitle className="mt-6">
            Your statement is read, never kept.
          </SectionTitle>
          <p className="mt-6 max-w-md text-sm leading-6 text-pretty text-muted-foreground">
            To read your transactions, the statement’s text is processed by our
            AI provider for that analysis only.
          </p>
        </Reveal>

        <ul className="divide-y divide-border rounded-[2rem] border border-border/70 bg-card">
          {PROMISES.map(({ icon: Icon, title, body }, index) => (
            <li key={title}>
              <Reveal delay={index * 100} className="flex gap-5 p-7 sm:p-8">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-accent/10 text-cyan-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.01em]">
                    {title}
                  </h3>
                  <p className="mt-1.5 leading-7 text-pretty text-muted-foreground">
                    {body}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
