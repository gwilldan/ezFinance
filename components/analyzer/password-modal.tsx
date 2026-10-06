"use client"

import { PasswordInput } from "@/components/password-input"
import { LockKeyhole, ShieldCheck, X } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"

export type PasswordReason = "required" | "incorrect"

export function PasswordModal({
  fileName,
  reason,
  onSubmit,
  onChooseAnother,
  onClose,
}: {
  fileName: string
  reason: PasswordReason
  onSubmit: (password: string) => void
  onChooseAnother: () => void
  onClose: () => void
}) {
  const [password, setPassword] = useState("")

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (password) onSubmit(password)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/50 p-4 duration-200 fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md animate-in rounded-3xl bg-white p-7 shadow-2xl duration-200 zoom-in-95"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <h2
          id="password-modal-title"
          className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-800"
        >
          This statement is password-protected
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter the password for{" "}
          <span className="font-medium text-slate-700">{fileName}</span>, or
          upload a copy without a password.
        </p>

        <div className="mt-5">
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Statement password"
            aria-label="Statement password"
            aria-invalid={reason === "incorrect"}
            autoComplete="off"
            autoFocus
            className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 focus-visible:border-emerald-300 focus-visible:ring-0 md:text-sm"
          />
          {reason === "incorrect" ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              That password didn&apos;t unlock the PDF. Please try again.
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="submit"
            disabled={!password}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:opacity-95 disabled:opacity-40"
          >
            Unlock and analyze
          </button>
          <button
            type="button"
            onClick={onChooseAnother}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Choose a different PDF
          </button>
        </div>

        <p className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          Your password is only used to open this file for this analysis. It is
          never saved or logged, and your PDF isn&apos;t stored. It&apos;s read
          in memory just to build your report, then discarded.
        </p>
      </form>
    </div>
  )
}
