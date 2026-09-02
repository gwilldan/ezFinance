"use client"

import React from "react"

export default function Analyzer() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 pt-30">
      {/* Hero / CTA */}
      <div className="rounded-2xl bg-slate-100 p-12 text-center shadow-sm">
        <button
          className="mx-auto rounded-xl bg-slate-900 px-10 py-4 text-white shadow-inner hover:opacity-95"
          aria-label="Analyze my statement"
        >
          Analyze my statement
        </button>
      </div>

      {/* Statement tool card */}
      <div className="mt-8 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-100">
        <h3 className="text-sm font-medium text-slate-700">Statement tool</h3>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 3v18h18" />
                <path d="M7 16v-6" />
                <path d="M11 16v-2" />
                <path d="M15 16v-10" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Analyze statement</div>
              <div className="mt-1 text-sm text-muted-foreground">Categories, cash flow, subscriptions and a full report.</div>
            </div>
          </div>
          <div className="text-slate-400" aria-hidden>
            ▾
          </div>
        </div>
      </div>

      {/* History card */}
      <div className="mt-8 rounded-2xl bg-white p-6 shadow ring-1 ring-slate-100">
        <h3 className="text-sm font-medium text-slate-700">History</h3>
        <div className="mt-4">
          <div className="mx-auto my-4 max-w-2xl rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            Upload your first statement above
            <div className="mt-1 text-xs text-muted-foreground">Your analyses and tool runs will appear here.</div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium">Free analysis</div>
              <div className="text-sm text-slate-500">0 / 1</div>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 w-0 rounded-full bg-slate-300" />
            </div>
            <div className="mt-3 text-right text-sm text-slate-500">Unlock more reports</div>
          </div>
        </div>
      </div>
    </div>
  )
}
