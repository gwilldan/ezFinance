export function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatPercent(value: number) {
  return `${Math.round((value || 0) * 1000) / 10}%`
}

export function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NG", {
        month: "short",
        day: "numeric",
      }).format(date)
}
