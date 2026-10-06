import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js"

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
)

// Canvas can't read CSS variables, so borrow the resolved page font.
if (typeof window !== "undefined") {
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily
}
Chart.defaults.color = "#94a3b8"

export const GRID_COLOR = "#f1f5f9"

export const TOOLTIP = {
  backgroundColor: "#0f172a",
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
} as const

/** Short axis labels: 1.2M, 450K. */
export function compactNumber(value: number | string) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(
    Number(value)
  )
}
