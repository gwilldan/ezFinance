"use client"

import { UsageCard } from "@/components/billing/usage-card"
import type { UsageSummary } from "@/lib/billing/types"
import { clearReport } from "@/lib/report-store"
import { Check, Database, Trash2 } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { ConfirmDialog } from "./confirm-dialog"

type Dialog = "data" | "account" | null

export function SettingsPage({
  email,
  usage,
  emailTips: initialEmailTips,
}: {
  email: string
  usage: UsageSummary
  emailTips: boolean
}) {
  const [emailTips, setEmailTips] = useState(initialEmailTips)
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle")
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dataCleared, setDataCleared] = useState(false)

  async function toggleEmailTips(next: boolean) {
    setEmailTips(next)
    setSaveState("idle")
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailTips: next }),
    }).catch(() => null)

    if (response?.ok) {
      setSaveState("saved")
    } else {
      setEmailTips(!next)
      setSaveState("error")
    }
  }

  async function deleteAccount() {
    const response = await fetch("/api/account", { method: "DELETE" })
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(data.error ?? "Unable to delete your account.")
    }
    clearReport()
    window.location.href = "/"
  }

  return (
    <main className="min-h-screen bg-background px-6 pt-36 pb-24 text-foreground">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium text-cyan-accent">Account</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Settings
        </h1>
        <p className="mt-3 text-muted-foreground">Signed in as {email}</p>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">
            Plan and usage
          </h2>
          <UsageCard usage={usage} className="mt-5" />
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">Email</h2>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
            <input
              type="checkbox"
              checked={emailTips}
              onChange={(event) => void toggleEmailTips(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-cyan-accent"
            />
            <span>
              Send me reminders and tips about my reports and plan. Sign-in
              links, receipts and billing notices always arrive.
            </span>
          </label>
          <p className="mt-2 h-5 pl-7 text-xs" role="status">
            {saveState === "saved" ? (
              <span className="inline-flex items-center gap-1 text-cyan-accent">
                <Check className="size-3.5" /> Saved
              </span>
            ) : saveState === "error" ? (
              <span className="text-red-600">
                Couldn&apos;t save. Please try again.
              </span>
            ) : null}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">
            Data controls
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These actions are permanent. Download anything you want to keep
            before continuing.
          </p>

          <div className="mt-6 divide-y divide-border rounded-3xl border border-border bg-card shadow-sm">
            <ControlRow
              icon={<Database className="size-4" />}
              iconClass="bg-cyan-accent-soft text-cyan-accent"
              title="Delete analysis data"
              description="Remove the report saved in this browser. Your statements are never stored on our servers."
              action={
                <button
                  type="button"
                  onClick={() => setDialog("data")}
                  disabled={dataCleared}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
                >
                  {dataCleared ? "Deleted" : "Delete data"}
                </button>
              }
            />
            <ControlRow
              icon={<Trash2 className="size-4" />}
              iconClass="bg-red-50 text-red-600"
              title="Delete account"
              description="Permanently erase your ezFinance account and sign-in. This can't be undone."
              action={
                <button
                  type="button"
                  onClick={() => setDialog("account")}
                  className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete account
                </button>
              }
            />
          </div>
        </section>
      </div>

      {dialog === "data" ? (
        <ConfirmDialog
          title="Delete analysis data?"
          description="This removes your latest report from this browser. You can analyze a statement again at any time."
          confirmLabel="Delete data"
          onConfirm={async () => {
            clearReport()
            setDataCleared(true)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "account" ? (
        <ConfirmDialog
          title="Delete your account?"
          description="Your ezFinance account and sign-in will be permanently deleted and you'll be signed out."
          confirmLabel="Delete account"
          requireText="DELETE"
          onConfirm={deleteAccount}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </main>
  )
}

function ControlRow({
  icon,
  iconClass,
  title,
  description,
  action,
}: {
  icon: ReactNode
  iconClass: string
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-4">
        <div
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="shrink-0 sm:pl-4">{action}</div>
    </div>
  )
}
