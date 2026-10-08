"use client"

import type { ChatMessage } from "@/lib/bank-statement/chat"
import {
  summarize,
  type ReportSummary,
  type SavedReport,
} from "@/lib/reports/types"
import { useSyncExternalStore } from "react"

/**
 * Statements saved on this device. They live in localStorage, scoped to the
 * signed-in user, and never reach our servers.
 */

const UPDATED_EVENT = "ezfinance:reports-updated"

const storageKey = (userId: string) => `ezfinance:reports:${userId}`

const cache = new Map<string, { json: string | null; reports: SavedReport[] }>()

function readReports(userId: string): SavedReport[] {
  const key = storageKey(userId)
  let json: string | null = null
  try {
    json = window.localStorage.getItem(key)
  } catch {
    // Storage is blocked (e.g. a private window): nothing saved here.
  }

  const cached = cache.get(key)
  if (cached && cached.json === json) return cached.reports

  let reports: SavedReport[] = []
  try {
    const parsed: unknown = json ? JSON.parse(json) : []
    if (Array.isArray(parsed)) reports = parsed as SavedReport[]
  } catch {
    reports = []
  }
  cache.set(key, { json, reports })
  return reports
}

function writeReports(userId: string, reports: SavedReport[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(reports))
  } catch {
    throw new Error(
      "This browser has no room to save the report. Delete some saved reports in Settings, or switch to cloud storage."
    )
  }
  window.dispatchEvent(new Event(UPDATED_EVENT))
}

export function saveLocalReport(userId: string, saved: SavedReport) {
  const others = readReports(userId).filter(({ id }) => id !== saved.id)
  writeReports(userId, [saved, ...others])
}

export function saveLocalMessages(
  userId: string,
  id: string,
  messages: ChatMessage[]
) {
  const reports = readReports(userId)
  if (!reports.some((saved) => saved.id === id)) return
  writeReports(
    userId,
    reports.map((saved) => (saved.id === id ? { ...saved, messages } : saved))
  )
}

export function clearLocalReports(userId: string) {
  try {
    window.localStorage.removeItem(storageKey(userId))
  } catch {
    // Nothing to clear.
  }
  window.dispatchEvent(new Event(UPDATED_EVENT))
}

const EMPTY: ReportSummary[] = []
const summaries = new WeakMap<SavedReport[], ReportSummary[]>()

/** History of this device's reports; empty until the browser has loaded. */
export function useLocalReportSummaries(userId: string): ReportSummary[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      const reports = readReports(userId)
      let list = summaries.get(reports)
      if (!list) {
        list = reports.map((saved) => summarize(saved, "local"))
        summaries.set(reports, list)
      }
      return list
    },
    () => EMPTY
  )
}

/**
 * One report saved on this device: `undefined` while the browser loads,
 * `null` when it isn't here.
 */
export function useLocalReport(
  userId: string,
  id: string
): SavedReport | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => readReports(userId).find((saved) => saved.id === id) ?? null,
    () => undefined
  )
}

function subscribe(callback: () => void) {
  window.addEventListener(UPDATED_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(UPDATED_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}
