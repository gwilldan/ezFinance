"use client"

import { FormEvent, useEffect, useState } from "react"

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  requireText,
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  confirmLabel: string
  /** When set, the user must type this exactly before confirming. */
  requireText?: string
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [typed, setTyped] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = !requireText || typed === requireText

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose, pending])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ready || pending) return
    setPending(true)
    setError(null)
    try {
      await onConfirm()
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Something went wrong."
      )
      setPending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/50 p-4 duration-200 fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md animate-in rounded-3xl bg-card p-7 shadow-2xl duration-200 zoom-in-95"
      >
        <h2
          id="confirm-title"
          className="text-xl font-semibold tracking-[-0.03em]"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        {requireText ? (
          <label className="mt-5 block text-sm text-muted-foreground">
            Type{" "}
            <span className="font-semibold text-foreground">{requireText}</span>{" "}
            to confirm
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoFocus
              autoComplete="off"
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-red-300"
            />
          </label>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || pending}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
