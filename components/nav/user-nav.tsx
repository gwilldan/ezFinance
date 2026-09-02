"use client"

import {
  Bell,
  ChevronDown,
  CreditCard,
  FileText,
  Globe,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react"
import EzFinanceIcon from "../ui/icon"
import { User } from "@/lib/supabase/server"
import Image from "next/image"
import { useState } from "react"

const navItems = ["Home", "Pricing"]

const menuItems = [
  { label: "Billing", icon: CreditCard },
  { label: "Settings", icon: Settings },
  { label: "Developers", icon: FileText },
  { label: "Contact", icon: Sparkles },
]

export function UserNav({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-6 lg:px-10">
        <EzFinanceIcon href="/" />

        <section className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
          {navItems.map((item) => (
            <button
              key={item}
              className={
                item === "Home"
                  ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-full px-4 py-2 text-sm text-slate-600 hover:bg-white hover:text-slate-900"
              }
            >
              {item}
            </button>
          ))}
        </section>

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex items-center gap-2 border border-red-500"
        >
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1.5">
            {user.user_metadata.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                height={32}
                width={32}
                alt="icon"
                className="rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#f7d3c5,#f3b8b3_30%,#f59e9f_63%,#c084fc_100%)] text-xs font-semibold text-white">
                {(user.user_metadata.full_name as string).slice(0, 1)}
              </div>
            )}
            <div className="hidden text-left md:block">
              <div className="text-sm font-medium text-slate-900">
                {user.user_metadata.full_name}
              </div>
              <div className="text-[11px] text-slate-500">{user.email}</div>
            </div>
            <ChevronDown className="size-4 text-slate-500" />
          </div>

          {isOpen && <UserPanel />}
        </button>
      </div>
    </nav>
  )
}

// user drop down panel
function UserPanel() {
  return (
    <aside className="absolute right-0 bottom-[200px]">
      {/* <aside className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:w-[20rem]"> */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#f7d3c5,#f3b8b3_30%,#f59e9f_63%,#c084fc_100%)] text-base font-semibold text-white">
          G
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900">
            Godswill Effiong
          </div>
          <div className="text-sm text-slate-500">sayhi2godswill@gmail.com</div>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {menuItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon className="size-4 text-slate-500" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <button className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#ef4444] transition-colors hover:bg-red-50">
        <LogOut className="size-4" />
        <span>Sign out</span>
      </button>
    </aside>
  )
}
