"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { ArrowRight, X, Menu, Wallet } from "lucide-react";

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="ezFinance home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-accent text-cyan-accent-foreground shadow-sm shadow-cyan-accent/30"><Wallet className="size-4" /></span>
          <span>ezFinance</span>
        </a>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#product" className="transition-colors hover:text-foreground">Product</a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#security" className="transition-colors hover:text-foreground">Security</a>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" className="text-muted-foreground">Log in</Button>
          <Button className="rounded-full bg-cyan-accent px-5 text-cyan-accent-foreground shadow-sm shadow-cyan-accent/25 hover:bg-cyan-accent/85">Get started <ArrowRight className="size-4" /></Button>
        </div>
        <button className="rounded-md p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {menuOpen && <div className="mx-6 flex flex-col gap-4 border-t border-border py-5 text-sm md:hidden"><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#security">Security</a><Button className="rounded-full bg-cyan-accent text-cyan-accent-foreground shadow-sm shadow-cyan-accent/25 hover:bg-cyan-accent/85">Get started</Button></div>}
    </nav>
  )
}
