import type { ReactNode } from "react"

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  /** `icon` replaces the visible text; `label` stays as the accessible name. */
  options: { value: T; label: string; icon?: ReactNode }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex shrink-0 rounded-full bg-slate-100 p-1 text-xs font-medium"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          aria-label={option.icon ? option.label : undefined}
          title={option.icon ? option.label : undefined}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1.5 transition-colors [&_svg]:h-4 [&_svg]:w-4 ${option.value === value ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {option.icon ?? option.label}
        </button>
      ))}
    </div>
  )
}
