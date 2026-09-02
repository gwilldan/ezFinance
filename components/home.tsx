"use client"

import { ArrowRight, AtSign, BarChart3, FileUp, Sparkles } from "lucide-react"
import { AuthModal, type AuthMode } from "@/components/auth-modal"
import { Button } from "@/components/ui/button"
import Modal from "./modal"
import Mockup from "./home-mockup"
import { useState } from "react"  

const features = [
  {
    icon: BarChart3,
    title: "See your cash clearly",
    body: "Track every inflow and outflow in one calm, current view.",
  },
  {
    icon: FileUp,
    title: "Turn statements into insight",
    body: "Upload a bank statement and let ezFinance organize the noise.",
  },
  {
    icon: Sparkles,
    title: "Plan with confidence",
    body: "Get practical forecasts and next steps built around your goals.",
  },
]

import React, { useEffect, useState } from "react"
"use client"

import { ArrowRight, AtSign, BarChart3, FileUp, Sparkles } from "lucide-react"
import { AuthModal, type AuthMode } from "@/components/auth-modal"
import { Button } from "@/components/ui/button"
import Modal from "./modal"
import Mockup from "./home-mockup"
import Analyzer from "@/components/analyzer/analyzer"

const features = [
  {
    icon: BarChart3,
    title: "See your cash clearly",
    body: "Track every inflow and outflow in one calm, current view.",
  },
  {
    icon: FileUp,
    title: "Turn statements into insight",
    body: "Upload a bank statement and let ezFinance organize the noise.",
  },
  {
    icon: Sparkles,
    title: "Plan with confidence",
    body: "Get practical forecasts and next steps built around your goals.",
  },
]

export function Home() {
  const [showDemo, setShowDemo] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [user, setUser] = useState<{ id?: string | null; name?: string; email?: string } | null>(null)

  // Decode JWT payload without extra dependencies
  function decodeJwtPayload(t: string | null) {
    if (!t) return null
    try {
      const [, payload] = t.split('.')
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      )
      return JSON.parse(json)
    } catch (e) {
      return null
    }
  }

  useEffect(() => {
    // On load, always check sessionStorage for a jwt
    try {
      const token = sessionStorage.getItem('jwt')
      if (token) {
        const payload = decodeJwtPayload(token)
        if (payload) {
          const derived = {
            id: payload.sub ?? payload.id ?? payload.userId,
            name: payload.name ?? payload.fullName ?? payload.username,
            email: payload.email,
          }
          setUser(derived)
          // ensure a persisted user object exists in localStorage as well
          try {
            const existing = localStorage.getItem('user')
            if (!existing || existing === 'null') {
              localStorage.setItem('user', JSON.stringify(derived))
            }
          } catch (e) {
            // ignore localStorage errors
          }
          return
        }
      }

      // no token -> ensure user is null
      setUser(null)
    } catch (e) {
      setUser(null)
    }
  }, [])

  // If user has id, show Analyzer
  if (user && user.id) {
    return <Analyzer />
  }

  // otherwise return the landing UI
  return (
    <main className="min-h-screen overflow-hidden bg-background pt-20 text-foreground">
      <section
        id="top"
        className="mx-auto grid max-w-7xl items-center gap-14 px-6 pt-16 pb-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pt-24 lg:pb-28"
      >
        <div className="max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-accent/20 bg-cyan-accent-soft/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-cyan-accent shadow-[0_0_12px_var(--cyan-accent)]" />
            Your clearer financial picture
          </div>
          <h1 className="text-5xl leading-[1.02] font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-[76px]">
            Make smarter moves with your money.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-pretty text-muted-foreground">
            ezFinance turns scattered financial data into simple plans, useful
            answers, and a view of what comes next.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="rounded-full bg-cyan-accent px-6 py-5 text-cyan-accent-foreground shadow-lg shadow-cyan-accent/20 hover:bg-cyan-accent/85"
              onClick={() => setAuthMode("signup")}
            >
              Start planning <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "mailto:contact@gwilldan.xyz")}
              className="rounded-full border-cyan-accent/30 px-6 py-5 hover:bg-cyan-accent-soft/70 hover:text-foreground"
            >
              <AtSign className="size-4 text-cyan-accent" /> Contact Us
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">No spreadsheets. No finance degree.</p>
        </div>

        <Mockup />
      </section>

      <section id="product" className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-3 lg:px-10 lg:py-20">
          {features.map(({ icon: Icon, title, body }, index) => (
            <div key={title} className="flex gap-4">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${index === 0 ? "bg-cyan-accent/10" : index === 1 ? "bg-gold-accent/15" : "bg-muted"}`}>
                <Icon className={`size-5 ${index === 0 ? "text-cyan-accent" : index === 1 ? "text-gold-accent" : "text-foreground"}`} />
              </span>
              <div>
                <h2 className="font-medium tracking-tight">{title}</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-20 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground">A simpler way forward</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">From raw transactions to a plan you can act on.</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">Connect your accounts or upload a statement. ezFinance categorizes your activity, spots patterns, and helps you decide what to do next.</p>
      </section>

      {showDemo && <Modal setShowDemo={setShowDemo} />}
      {authMode && (
        <AuthModal mode={authMode} onModeChange={setAuthMode} onClose={() => setAuthMode(null)} />
      )}
    </main>
  )
}
