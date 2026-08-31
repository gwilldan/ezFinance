"use client"

import * as React from "react"
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  FileUp,

  Play,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  { icon: BarChart3, title: "See your cash clearly", body: "Track every inflow and outflow in one calm, current view." },
  { icon: FileUp, title: "Turn statements into insight", body: "Upload a bank statement and let ezFinance organize the noise." },
  { icon: Sparkles, title: "Plan with confidence", body: "Get practical forecasts and next steps built around your goals." },
]

export function Home() {

  const [showDemo, setShowDemo] = React.useState(false)

  return (
    <main className="min-h-screen overflow-hidden bg-background pt-20 text-foreground">

      <section id="top" className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-28 lg:pt-24">
        <div className="max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-accent/20 bg-cyan-accent-soft/50 px-3 py-1.5 text-xs font-medium text-muted-foreground"><span className="size-1.5 rounded-full bg-cyan-accent shadow-[0_0_12px_var(--cyan-accent)]" />Your clearer financial picture</div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[76px]">Make smarter moves with your money.</h1>
          <p className="mt-7 max-w-lg text-pretty text-lg leading-8 text-muted-foreground">ezFinance turns scattered financial data into simple plans, useful answers, and a view of what comes next.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="rounded-full bg-cyan-accent px-6 text-cyan-accent-foreground shadow-lg shadow-cyan-accent/20 hover:bg-cyan-accent/85" onClick={() => setShowDemo(true)}>Start planning free <ArrowRight className="size-4" /></Button><Button size="lg" variant="outline" className="rounded-full border-cyan-accent/30 px-6 hover:bg-cyan-accent-soft/70 hover:text-foreground" onClick={() => setShowDemo(true)}><Play className="size-4 fill-current text-cyan-accent" /> See how it works</Button></div>
          <p className="mt-5 text-xs text-muted-foreground">No spreadsheets. No finance degree. No credit card.</p>
        </div>
        <div className="relative min-h-[410px] rounded-3xl border border-cyan-accent/15 bg-gradient-to-br from-cyan-accent-soft/70 via-muted/50 to-gold-accent-soft/70 p-4 shadow-sm sm:p-7">
          <div className="absolute -right-8 top-10 hidden h-28 w-28 rounded-full border border-border bg-card/80 lg:block" />
          <div className="relative rounded-2xl border border-border bg-card p-5 shadow-xl shadow-foreground/5 sm:p-7">
            <div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">Total balance</p><p className="mt-1 text-3xl font-semibold tracking-tight">$24,680.40</p></div><span className="rounded-full bg-cyan-accent/12 px-2.5 py-1 text-xs font-medium text-cyan-accent">+12.8%</span></div>
            <div className="mt-8 flex h-40 items-end gap-2 border-b border-border pb-0 sm:gap-4">{[42, 61, 52, 72, 64, 82, 94, 78, 100, 89, 106, 120].map((height, i) => <div key={i} className="flex flex-1 flex-col justify-end"><div className={`rounded-t-md ${i > 8 ? "bg-cyan-accent shadow-[0_0_18px_color-mix(in_oklch,var(--cyan-accent),transparent_55%)]" : "bg-border"}`} style={{ height: `${height}px` }} /></div>)}</div>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground"><span>Jan</span><span>Jun</span><span>Dec</span></div>
            <div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Income</p><p className="mt-1 font-medium">$8,420.00</p></div><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Expenses</p><p className="mt-1 font-medium">$4,182.60</p></div></div>
          </div>
          <div className="relative -mt-5 ml-auto flex w-[82%] items-center gap-3 rounded-xl border border-cyan-accent/20 bg-card px-4 py-3 shadow-lg"><span className="flex size-8 items-center justify-center rounded-lg bg-cyan-accent/15 text-cyan-accent"><Sparkles className="size-4" /></span><div className="text-xs"><p className="font-medium">Your spending is on track</p><p className="mt-0.5 text-muted-foreground">You&apos;re 18% below your monthly plan.</p></div><ChevronDown className="ml-auto size-4 text-muted-foreground" /></div>
        </div>
      </section>

      <section id="product" className="border-y border-border bg-card"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-3 lg:px-10 lg:py-20">{features.map(({ icon: Icon, title, body }, index) => <div key={title} className="flex gap-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${index === 0 ? "bg-cyan-accent/10" : index === 1 ? "bg-gold-accent/15" : "bg-muted"}`}><Icon className={`size-5 ${index === 0 ? "text-cyan-accent" : index === 1 ? "text-gold-accent" : "text-foreground"}`} /></span><div><h2 className="font-medium tracking-tight">{title}</h2><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{body}</p></div></div>)}</div></section>

      <section id="how-it-works" className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-20 lg:flex-row lg:items-end lg:justify-between lg:px-10"><div><p className="text-sm font-medium text-muted-foreground">A simpler way forward</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">From raw transactions to a plan you can act on.</h2></div><p className="max-w-sm text-sm leading-6 text-muted-foreground">Connect your accounts or upload a statement. ezFinance categorizes your activity, spots patterns, and helps you decide what to do next.</p></section>

      <footer id="security" className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-border px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10"><p>© 2025 ezFinance. Financial clarity, made simple.</p><p>Private by design · Built for your next good decision.</p></footer>

      {showDemo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-6" role="dialog" aria-modal="true" aria-label="ezFinance demo"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Your financial co-pilot</h2><button onClick={() => setShowDemo(false)} aria-label="Close demo"><X className="size-5 text-muted-foreground" /></button></div><p className="mt-3 text-sm leading-6 text-muted-foreground">Bring your bank statement or connect an account to get a clear view of your money in minutes.</p><div className="mt-6 flex flex-col gap-3"><Button className="w-full rounded-full" onClick={() => setShowDemo(false)}><FileUp className="size-4" /> Upload a statement</Button><Button variant="outline" className="w-full rounded-full" onClick={() => setShowDemo(false)}>Connect an account</Button></div><div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Check className="size-3.5" /> Bank-level encryption</div></div></div>}
    </main>
  )
}
