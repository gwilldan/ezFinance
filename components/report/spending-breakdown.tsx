"use client"

import type { CategoryBreakdown } from "@/lib/bank-statement/schema"
import { CATEGORY_COLORS } from "@/lib/category-colors"
import { formatMoney, formatPercent } from "@/lib/format"
import { useState } from "react"
import { Bar, Pie } from "react-chartjs-2"
import { compactNumber, GRID_COLOR, TOOLTIP } from "./chart-setup"
import { Segmented } from "./segmented"

type ChartType = "bar" | "pie"

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "pie", label: "Pie" },
]

export function SpendingBreakdown({
  categories,
  totalOut,
  currency,
}: {
  categories: CategoryBreakdown[]
  totalOut: number
  currency: string
}) {
  const [chartType, setChartType] = useState<ChartType>("bar")
  const labels = categories.map((item) => item.category)
  const colors = categories.map((item) => CATEGORY_COLORS[item.category])
  const data = {
    labels,
    datasets: [
      {
        label: "Spent",
        data: categories.map((item) => item.total),
        backgroundColor: colors,
        borderColor: "#ffffff",
        borderWidth: chartType === "pie" ? 2 : 0,
        borderRadius: chartType === "bar" ? 4 : 0,
        maxBarThickness: 22,
      },
    ],
  }
  const tooltip = {
    ...TOOLTIP,
    callbacks: {
      label: (item: { dataIndex: number }) => {
        const category = categories[item.dataIndex]
        return `${formatMoney(category.total, currency)} · ${formatPercent(category.pct)}`
      },
    },
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-700">
            See where every naira went
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {formatMoney(totalOut, currency)} across {categories.length}{" "}
            categories
          </p>
        </div>
        {categories.length ? (
          <Segmented
            label="Chart type"
            options={CHART_TYPES}
            value={chartType}
            onChange={setChartType}
          />
        ) : null}
      </div>

      {categories.length ? (
        <>
          <div
            className="mt-6"
            style={{
              height:
                chartType === "pie" ? 240 : Math.max(160, labels.length * 34),
            }}
          >
            {chartType === "pie" ? (
              <Pie
                data={data}
                options={{
                  maintainAspectRatio: false,
                  plugins: { tooltip },
                }}
              />
            ) : (
              <Bar
                data={data}
                options={{
                  indexAxis: "y",
                  maintainAspectRatio: false,
                  plugins: { tooltip },
                  scales: {
                    x: {
                      grid: { color: GRID_COLOR },
                      border: { display: false },
                      ticks: { callback: compactNumber },
                    },
                    y: { grid: { display: false } },
                  },
                }}
              />
            )}
          </div>

          <ul className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {categories.map((item) => (
              <li
                key={item.category}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                  />
                  {item.category}
                </span>
                <span className="text-slate-500">
                  {formatMoney(item.total, currency)} ·{" "}
                  {formatPercent(item.pct)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          No debit categories were found.
        </p>
      )}
    </>
  )
}
