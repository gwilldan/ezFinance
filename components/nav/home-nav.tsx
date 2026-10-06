"use client"

import { AuthModal, type AuthMode } from "@/components/auth-modal"
import { ArrowRight, Menu, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import EzFinanceIcon from "../ui/icon"

const LINKS = [
  { label: "Story", href: "/#story" },
  { label: "Products", href: "/#products" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
]

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)

  function openAuth(mode: AuthMode) {
    setAuthMode(mode)
    setMenuOpen(false)
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4">
        <nav
          aria-label="Main"
          className="mx-auto max-w-6xl rounded-3xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-card/65 sm:px-5"
        >
          <div className="flex items-center justify-between gap-4">
            <EzFinanceIcon href="/" />

            <ul className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
              {LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="rounded-full px-3.5 py-2 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:outline-none"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:outline-none"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink/85 focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Get started <ArrowRight className="size-4" />
              </button>
            </div>

            <button
              type="button"
              className="rounded-full p-2 md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>

          {menuOpen ? (
            <div
              id="mobile-menu"
              className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm md:hidden"
            >
              {LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 hover:bg-muted"
                >
                  {label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  className="rounded-full border border-border px-4 py-2.5"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("signup")}
                  className="rounded-full bg-ink px-4 py-2.5 font-medium text-ink-foreground"
                >
                  Get started
                </button>
              </div>
            </div>
          ) : null}
        </nav>
      </header>

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
