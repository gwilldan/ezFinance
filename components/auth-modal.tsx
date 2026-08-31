"use client"

import { X } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"

export type AuthMode = "login" | "signup"

export function AuthModal({
  mode,
  onModeChange,
  onClose,
}: {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onClose: () => void
}) {
  const title =
    mode === "signup" ? "Create your ezFinance account" : "Log in to ezFinance"

  return (
    <div
      className="fixed inset-0 z-50 flex max-h-dvh animate-in items-center justify-center overflow-y-auto bg-black/50 p-4 duration-200 fade-in sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative w-full max-w-[28.5rem] animate-in rounded-[1.5rem] shadow-2xl duration-200 zoom-in-95 slide-in-from-bottom-2">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
          aria-label="Close auth form"
        >
          <X className="size-5" />
        </button>

        {mode === "signup" ? (
          <SignupForm
            className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onSwitchToLogin={() => onModeChange("login")}
          />
        ) : (
          <LoginForm onSwitchToSignup={() => onModeChange("signup")} />
        )}
      </div>
    </div>
  )
}
