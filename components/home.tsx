"use client"

import { AuthModal, type AuthMode } from "@/components/auth-modal"
import { Closing } from "@/components/landing/closing"
import { DeepDive } from "@/components/landing/deep-dive"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Privacy } from "@/components/landing/privacy"
import { Problem } from "@/components/landing/problem"
import { Suite } from "@/components/landing/suite"
import { useState } from "react"

/**
 * The marketing story: the noise of money (problem), the ezFinance suite
 * (turn), how the analyzer works, inside the report, privacy, then begin.
 */
export function Home() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const start = () => setAuthMode("signup")

  return (
    <main className="bg-paper text-foreground">
      <Hero onStart={start} />
      <Problem />
      <Suite onStart={start} />
      <HowItWorks />
      <DeepDive />
      <Privacy />
      <Closing onStart={start} />

      {authMode && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthMode(null)}
        />
      )}
    </main>
  )
}
