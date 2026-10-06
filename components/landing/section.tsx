import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

/** Small label above a section title, e.g. "Personal finance, made clear". */
export function Eyebrow({
  children,
  tone = "light",
}: {
  children: ReactNode
  tone?: "light" | "dark"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.05em] whitespace-nowrap uppercase",
        tone === "light"
          ? "border-border bg-card/70 text-muted-foreground"
          : "border-white/15 bg-white/5 text-ink-muted"
      )}
    >
      <span className="size-1.5 rounded-full bg-cyan-accent" aria-hidden />
      {children}
    </span>
  )
}

/** Editorial serif section heading. */
export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode
  className?: string
  as?: "h1" | "h2" | "h3"
}) {
  return (
    <Tag
      className={cn(
        "font-serif text-4xl leading-[1.1] tracking-[-0.01em] text-balance sm:text-5xl lg:text-6xl",
        className
      )}
    >
      {children}
    </Tag>
  )
}

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-cyan-accent px-6 py-3 text-sm font-medium whitespace-nowrap text-cyan-accent-foreground shadow-lg shadow-cyan-accent/25 transition-colors hover:bg-cyan-accent/85 focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:ring-offset-2 focus-visible:outline-none"

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:ring-offset-2 focus-visible:outline-none"
