import { ArrowRight } from "lucide-react"
import {
  AssistantCard,
  BalanceCard,
  CategoryCard,
  VerifiedCard,
} from "./product-cards"
import { Eyebrow, primaryButton, secondaryButton } from "./section"

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pt-40 pb-20 lg:pt-48"
    >
      <div className="mx-auto max-w-4xl text-center">
        <div className="animate-blur-in">
          <Eyebrow>Personal finance, made clear</Eyebrow>
        </div>
        <h1 className="mt-8 font-serif text-[3.25rem] leading-[1.05] tracking-[-0.02em] text-balance sm:text-7xl lg:text-[5.75rem]">
          <span className="animate-blur-in block [animation-delay:120ms]">
            Your money,
          </span>
          <span className="animate-blur-in block text-muted-foreground italic [animation-delay:320ms]">
            finally making sense.
          </span>
        </h1>
        <p className="animate-blur-in mx-auto mt-7 max-w-xl text-lg leading-8 text-pretty text-muted-foreground [animation-delay:520ms]">
          ezFinance turns bank statements, everyday spending and tax season into
          one calm, clear picture.
        </p>
        <div className="animate-blur-in mt-10 flex flex-col justify-center gap-3 [animation-delay:680ms] sm:flex-row">
          <button type="button" onClick={onStart} className={primaryButton}>
            Analyze a statement <ArrowRight className="size-4" />
          </button>
          <a href="#how-it-works" className={secondaryButton}>
            See how it works
          </a>
        </div>
        <p className="animate-blur-in mt-5 text-xs text-muted-foreground [animation-delay:800ms]">
          First analysis free · No card needed · Statements never stored
        </p>
      </div>

      <HeroScene />
    </section>
  )
}

/** Floating product cards on a soft blue stage. Decorative. */
function HeroScene() {
  return (
    <div
      aria-hidden
      className="animate-blur-in relative mx-auto mt-20 max-w-6xl [animation-delay:900ms]"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(120%_90%_at_50%_0%,color-mix(in_oklch,var(--cyan-accent)_22%,white)_0%,var(--paper)_70%)] px-5 pt-12 pb-10 sm:px-10 lg:h-[30rem] lg:px-0 lg:pt-0 lg:pb-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:block">
          <BalanceCard className="animate-float lg:absolute lg:top-16 lg:left-1/2 lg:w-[26rem] lg:-translate-x-1/2" />
          <CategoryCard className="animate-float hidden [animation-delay:-2s] sm:block lg:absolute lg:top-28 lg:left-[6%] lg:w-72" />
          <AssistantCard className="animate-float [animation-delay:-4s] lg:absolute lg:top-24 lg:right-[6%] lg:w-72" />
          <VerifiedCard className="animate-float hidden [animation-delay:-1s] lg:absolute lg:bottom-12 lg:left-1/2 lg:flex lg:w-64 lg:-translate-x-1/2" />
        </div>
      </div>
    </div>
  )
}
