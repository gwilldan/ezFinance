"use client"

import {
  balanceByPeriod,
  type BalancePeriod,
} from "@/lib/bank-statement/analyze"
import type { RunningBalancePoint } from "@/lib/bank-statement/schema"
import { formatDate, formatMoney, formatMonth } from "@/lib/format"
import { useMemo, useState } from "react"
import { Line } from "react-chartjs-2"
import { compactNumber, GRID_COLOR, TOOLTIP } from "./chart-setup"
import { Segmented } from "./segmented"

const LINE_COLOR = "#10b981"
const PERIODS: { value: BalancePeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

export function BalanceChart({
  points,
  currency,
}: {
  points: RunningBalancePoint[]
  currency: string
}) {
  const [period, setPeriod] = useState<BalancePeriod>("daily")
  const series = useMemo(
    () => balanceByPeriod(points, period),
    [points, period]
  )
  const labels = series.map(({ period: key }) =>
    period === "monthly"
      ? formatMonth(key)
      : period === "weekly"
        ? `Week of ${formatDate(key)}`
        : formatDate(key)
  )

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-700">
            Track your balance
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Closing balance per{" "}
            {period === "daily" ? "day" : period.replace("ly", "")}
          </p>
        </div>
        <Segmented
          label="Balance period"
          options={PERIODS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <div className="mt-6 h-72">
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Closing balance",
                data: series.map((item) => item.balance),
                borderColor: LINE_COLOR,
                backgroundColor: `${LINE_COLOR}14`,
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: series.length > 40 ? 0 : 3,
                pointHoverRadius: 5,
                pointBackgroundColor: LINE_COLOR,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              tooltip: {
                ...TOOLTIP,
                callbacks: {
                  label: (item) => formatMoney(item.parsed.y ?? 0, currency),
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { maxTicksLimit: 8, maxRotation: 0 },
              },
              y: {
                grid: { color: GRID_COLOR },
                border: { display: false },
                ticks: { callback: compactNumber },
              },
            },
          }}
        />
      </div>
    </>
  )
}
