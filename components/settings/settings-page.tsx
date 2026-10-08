"use client"

import { UsageCard } from "@/components/billing/usage-card"
import type { UsageSummary } from "@/lib/billing/types"
import { clearLocalReports } from "@/lib/report-store"
import type { ReportStorage } from "@/lib/reports/types"
import {
  Check,
  Cloud,
  Database,
  Laptop,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { ConfirmDialog } from "./confirm-dialog"

type Dialog = "data" | "account" | null
type SaveState = "idle" | "saved" | "error"

const STORAGE_OPTIONS: {
  value: ReportStorage
  title: string
  description: string
  icon: ReactNode
}[] = [
  {
    value: "local",
    title: "This device",
    description: "Reports are saved in this browser only.",
    icon: <Laptop className="size-4" />,
  },
  {
    value: "cloud",
    title: "ezFinance cloud",
    description: "Reports are saved, encrypted, to your account.",
    icon: <Cloud className="size-4" />,
  },
]

export function SettingsPage({
  userId,
  email,
  usage,
  emailTips: initialEmailTips,
  reportStorage: initialReportStorage,
}: {
  userId: string
  email: string
  usage: UsageSummary
  emailTips: boolean
  reportStorage: ReportStorage
}) {
  const [emailTips, setEmailTips] = useState(initialEmailTips)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [reportStorage, setReportStorage] = useState(initialReportStorage)
  const [storageSaveState, setStorageSaveState] = useState<SaveState>("idle")
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

  async function changeReportStorage(next: ReportStorage) {
    const previous = reportStorage
    setReportStorage(next)
    setStorageSaveState("idle")
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportStorage: next }),
    }).catch(() => null)

    if (response?.ok) {
      setStorageSaveState("saved")
    } else {
      setReportStorage(previous)
      setStorageSaveState("error")
    }
  }

  async function deleteAnalysisData() {
    const response = await fetch("/api/reports", { method: "DELETE" })
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(data.error ?? "Unable to delete your saved reports.")
    }
    clearLocalReports(userId)
    setDataCleared(true)
    setDialog(null)
  }

  async function deleteAccount() {
    const response = await fetch("/api/account", { method: "DELETE" })
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(data.error ?? "Unable to delete your account.")
    }
    clearLocalReports(userId)
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
          <SaveStatus state={saveState} className="pl-7" />
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">
            Statement storage
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose where new reports and their chats are saved. Reports you
            already have stay where they are.
          </p>
          <div
            role="radiogroup"
            aria-label="Statement storage"
            className="mt-5 grid gap-3 sm:grid-cols-2"
          >
            {STORAGE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-cyan-accent ${reportStorage === option.value ? "border-cyan-accent bg-cyan-accent-soft" : "border-border bg-card hover:bg-muted"}`}
              >
                <input
                  type="radio"
                  name="report-storage"
                  value={option.value}
                  checked={reportStorage === option.value}
                  onChange={() => void changeReportStorage(option.value)}
                  className="mt-1 size-4 shrink-0 accent-cyan-accent"
                />
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    {option.icon} {option.title}
                  </span>
                  <span className="mt-1 block leading-6 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {reportStorage === "local" ? (
            <p className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Reports saved on this device are tied to this browser only. They
              won&apos;t appear on your other devices, and they&apos;re lost if
              you clear your browser data. Keeping them is up to you.
            </p>
          ) : (
            <p className="mt-4 flex gap-2 rounded-xl border border-cyan-accent/20 bg-cyan-accent-soft p-3 text-xs leading-5 text-foreground">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-cyan-accent"
                aria-hidden
              />
              Reports saved to the cloud are encrypted and can only be opened
              when you&apos;re signed in to your account.
            </p>
          )}
          <SaveStatus state={storageSaveState} />
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
              description="Remove every report and chat saved in this browser and in your ezFinance cloud."
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
          description="This permanently removes your saved reports and their chats from this browser and from your ezFinance cloud. You can analyze a statement again at any time."
          confirmLabel="Delete data"
          onConfirm={deleteAnalysisData}
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

function SaveStatus({
  state,
  className = "",
}: {
  state: SaveState
  className?: string
}) {
  return (
    <p className={`mt-2 h-5 text-xs ${className}`} role="status">
      {state === "saved" ? (
        <span className="inline-flex items-center gap-1 text-cyan-accent">
          <Check className="size-3.5" /> Saved
        </span>
      ) : state === "error" ? (
        <span className="text-red-600">
          Couldn&apos;t save. Please try again.
        </span>
      ) : null}
    </p>
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
