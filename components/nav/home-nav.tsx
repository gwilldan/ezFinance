"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { ArrowRight, X, Menu } from "lucide-react"
import { AuthModal, type AuthMode } from "@/components/auth-modal"
import EzFinanceIcon from "../ui/icon"

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <EzFinanceIcon href="#top" />
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a
              href="#product"
              className="transition-colors hover:text-foreground"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#security"
              className="transition-colors hover:text-foreground"
            >
              Security
            </a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Button
              variant="ghost"
              className="px-6 py-5 text-muted-foreground"
              onClick={() => setAuthMode("login")}
            >
              Log in
            </Button>
            <Button
              className="rounded-full bg-cyan-accent px-6 py-5 text-cyan-accent-foreground shadow-sm shadow-cyan-accent/25 hover:bg-cyan-accent/85"
              onClick={() => setAuthMode("signup")}
            >
              Get started <ArrowRight className="size-4" />
            </Button>
          </div>
          <button
            className="rounded-md p-2 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        
        {menuOpen && (
          <div className="mx-6 flex flex-col gap-4 border-t border-border py-5 text-sm md:hidden">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#security">Security</a>
            <Button
              variant="ghost"
              className="rounded-full text-muted-foreground"
              onClick={() => {
                setAuthMode("login")
                setMenuOpen(false)
              }}
            >
              Log in
            </Button>
            <Button
              className="rounded-full bg-cyan-accent text-cyan-accent-foreground shadow-sm shadow-cyan-accent/25 hover:bg-cyan-accent/85"
              onClick={() => {
                setAuthMode("signup")
                setMenuOpen(false)
              }}
            >
              Get started
            </Button>
          </div>
        )}
      </nav>
      {authMode && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthMode(null)}
        />
      )}
    </>
  )
}
