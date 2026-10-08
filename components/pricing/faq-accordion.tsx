"use client"

import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { useId, useState } from "react"

type Faq = { question: string; answer: string }

/** All questions start closed; one open at a time; answers slide open smoothly. */
export function FaqAccordion({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const id = useId()

  return (
    <div className="divide-y divide-border rounded-[2rem] border border-border/70 bg-card">
      {items.map((item, index) => {
        const open = openIndex === index
        const panelId = `${id}-panel-${index}`
        const buttonId = `${id}-button-${index}`

        return (
          <div key={item.question} className="px-7">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between gap-6 py-6 text-left font-rethink text-lg leading-[1.4] font-semibold tracking-[-0.01em] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-cyan-accent focus-visible:outline-none"
              >
                {item.question}
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border border-border transition-[transform,background-color,color] duration-300 motion-reduce:transition-none",
                    open &&
                      "rotate-45 border-transparent bg-ink text-ink-foreground"
                  )}
                  aria-hidden
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                open
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              )}
              // Closed answers stay out of the tab order and away from screen readers.
              inert={!open}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-6 leading-[1.75] text-pretty text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
