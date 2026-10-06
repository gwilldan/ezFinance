"use client"

import { CONTACT_EMAIL } from "@/lib/plans"
import { signOut } from "@/lib/sign-out"
import type { User } from "@/lib/supabase/server"
import { CreditCard, LogOut, Mail, Settings } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import EzFinanceIcon from "../ui/icon"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
]

const MENU_LINKS = [
  { label: "Billing", href: "/pricing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Contact", href: `mailto:${CONTACT_EMAIL}`, icon: Mail },
]

export function UserNav({ user }: { user: User }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const fullName = String(user.user_metadata.full_name ?? "User")
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-6 lg:px-10">
        <EzFinanceIcon href="/" />

        <section className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={
                pathname === href
                  ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-full px-4 py-2 text-sm text-slate-600 hover:bg-white hover:text-slate-900"
              }
            >
              {label}
            </Link>
          ))}
        </section>

        <div ref={wrapperRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="user-panel"
            aria-label="Account menu"
            className="rounded-full shadow-sm ring-2 ring-white transition hover:ring-cyan-accent/40 focus-visible:ring-cyan-accent focus-visible:outline-none"
          >
            <Avatar name={fullName} url={avatarUrl} size={36} />
          </button>

          {isOpen && (
            <aside
              id="user-panel"
              className="absolute top-full right-0 z-50 mt-3 w-[20rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/80"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <Avatar name={fullName} url={avatarUrl} size={48} />
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-slate-900">
                    {fullName}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {MENU_LINKS.map(({ icon: Icon, label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Icon className="size-4 text-slate-500" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>

              <button
                type="button"
                onClick={() => signOut().catch(console.error)}
                className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </button>
            </aside>
          )}
        </div>
      </div>
    </nav>
  )
}

export function Avatar({
  name,
  url,
  size,
}: {
  name: string
  url: string | null
  size: number
}) {
  if (url) {
    return (
      <Image
        src={url}
        height={size}
        width={size}
        alt={name}
        className="rounded-full"
      />
    )
  }

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="flex items-center justify-center rounded-full bg-cyan-accent font-semibold text-cyan-accent-foreground"
    >
      {initials}
    </div>
  )
}
