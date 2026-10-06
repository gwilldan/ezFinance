import { FileUp, MessageCircleQuestion, ScanSearch } from "lucide-react"
import { Reveal } from "./reveal"
import { Eyebrow, SectionTitle } from "./section"

const STEPS = [
  {
    icon: FileUp,
    title: "Upload your statement",
    body: "Drop in the PDF your bank sends you. Password-protected? Enter it once to unlock the file. It’s never saved.",
  },
  {
    icon: ScanSearch,
    title: "We read and check every row",
    body: "ezFinance pulls out each transaction and checks it against your statement’s running balance, so the totals match your bank.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Understand it, then ask",
    body: "See your balance, spending by category and recurring charges. Then ask questions in plain English.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-3xl">
          <Eyebrow>How the analyzer works</Eyebrow>
          <SectionTitle className="mt-6">
            From PDF to clarity in about twenty seconds.
          </SectionTitle>
        </Reveal>

        <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <li key={title}>
              <Reveal delay={index * 120} className="relative">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-accent text-cyan-accent-foreground shadow-lg shadow-cyan-accent/25">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span
                    aria-hidden
                    className="hidden h-px flex-1 bg-gradient-to-r from-cyan-accent/40 to-transparent md:block"
                  />
                </div>
                <p className="mt-6 text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="mt-3 max-w-sm leading-7 text-pretty text-muted-foreground">
                  {body}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
