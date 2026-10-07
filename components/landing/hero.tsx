import { ArrowRight } from "lucide-react"
import { HeroBackdrop, HeroStatsCompact } from "./hero-backdrop"
import { primaryButton, secondaryButton } from "./section"

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pt-40 pb-24 lg:min-h-[47rem] lg:pt-48"
    >
      <HeroBackdrop />

      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="font-display text-[3.25rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-7xl lg:text-[5.25rem]">
          <span className="animate-blur-in block">Your money,</span>
          <span className="animate-blur-in block [animation-delay:200ms]">
            <span className="text-muted-foreground">finally </span>
            <span className="text-cyan-accent">
              making <SenseUnderline>sense</SenseUnderline>.
            </span>
          </span>
        </h1>

        <p className="animate-blur-in mx-auto mt-7 max-w-xl text-lg leading-8 text-pretty text-muted-foreground [animation-delay:450ms]">
          ezFinance AI turns bank statements, everyday spending and tax season into
          one calm, clear picture.
        </p>
        <div className="animate-blur-in mt-10 flex flex-col justify-center gap-3 [animation-delay:600ms] sm:flex-row">
          <button type="button" onClick={onStart} className={primaryButton}>
            Analyze a statement <ArrowRight className="size-4" />
          </button>
          <a href="#how-it-works" className={secondaryButton}>
            See how it works
          </a>
        </div>
        <p className="animate-blur-in mt-5 text-xs text-muted-foreground [animation-delay:750ms]">
          First report free · No card needed · Statements never stored
        </p>

        <HeroStatsCompact />
      </div>
    </section>
  )
}

/** Wraps a word with a hand-drawn underline that draws in after the headline. */
function SenseUnderline({ children }: { children: string }) {
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 20"
        preserveAspectRatio="none"
        className="absolute -bottom-[0.12em] left-0 h-[0.28em] w-full overflow-visible"
      >
        <path
          d="M3 14 C 45 6, 95 4, 140 8 S 190 13, 197 9"
          pathLength={1}
          className="animate-draw [animation-delay:900ms]"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  )
}
