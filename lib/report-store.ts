"use client"

import type { StatementReport } from "@/lib/bank-statement/schema"
import { useSyncExternalStore } from "react"

const STORAGE_KEY = "ezfinance:last-report"
const UPDATED_EVENT = "ezfinance:report-updated"

let cachedJson: string | null | undefined
let cachedReport: StatementReport | null = null

export function saveReport(report: StatementReport) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(report))
  window.dispatchEvent(new Event(UPDATED_EVENT))
}

export function clearReport() {
  window.sessionStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(UPDATED_EVENT))
}

export function useStoredReport(): StatementReport | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

function subscribe(callback: () => void) {
  window.addEventListener(UPDATED_EVENT, callback)
  return () => window.removeEventListener(UPDATED_EVENT, callback)
}

function getSnapshot(): StatementReport | null {
  const json = window.sessionStorage.getItem(STORAGE_KEY)
  if (json === cachedJson) return cachedReport

  cachedJson = json
  try {
    cachedReport = json ? (JSON.parse(json) as StatementReport) : null
  } catch {
    cachedReport = null
  }
  return cachedReport
}
