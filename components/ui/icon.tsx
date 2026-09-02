import { Wallet } from "lucide-react";

export default function EzFinanceIcon({href}: {href: string}) {
  return (
       <a
            href={href}
            className="flex items-center gap-2 font-semibold tracking-tight"
            aria-label="ezFinance home"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-accent text-cyan-accent-foreground shadow-sm shadow-cyan-accent/30">
              <Wallet className="size-4" />
            </span>
            <span>ezFinance</span>
          </a>
  )
}
