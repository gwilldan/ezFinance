"use client"

import { Progress } from "@/components/ui/progress"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

// Navigations that finish sooner than this never show the bar, so prefetched
// pages don't flash it.
const SHOW_AFTER_MS = 120
const TRICKLE_MS = 200
// The bar creeps toward this until the page arrives, then fills.
const TRICKLE_CEILING = 90
const FADE_MS = 300
// Gives up on a navigation that never lands (a failed or cancelled one).
const GIVE_UP_MS = 15_000

/**
 * A thin accent bar along the top of the window while a page loads. It starts
 * when an internal link to another page is clicked, or on back and forward,
 * and fills once the new page's path is showing.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const [value, setValue] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const finishRef = useRef(() => {})

  useEffect(() => {
    let active = false
    let timers: number[] = []
    const clear = () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer)
        window.clearInterval(timer)
      })
      timers = []
    }

    function start() {
      if (active) return
      active = true
      clear()
      timers.push(
        window.setTimeout(() => {
          setValue(8)
          setVisible(true)
          timers.push(
            window.setInterval(() => {
              setValue((current) =>
                current === null
                  ? null
                  : current + (TRICKLE_CEILING - current) * 0.1
              )
            }, TRICKLE_MS)
          )
        }, SHOW_AFTER_MS),
        window.setTimeout(finish, GIVE_UP_MS)
      )
    }

    function finish() {
      if (!active) return
      active = false
      clear()
      setValue((current) => (current === null ? null : 100))
      timers.push(
        window.setTimeout(() => setVisible(false), FADE_MS),
        window.setTimeout(() => setValue(null), FADE_MS * 2)
      )
    }
    finishRef.current = finish

    function onClick(event: MouseEvent) {
      const modified =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      if (event.button !== 0 || modified) return
      const link = (event.target as Element | null)?.closest("a")
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return
      const url = new URL(link.href, window.location.href)
      // Another site, or the same page (a hash or a query): nothing to load.
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      start()
    }

    // Capture, because next/link cancels the click before it bubbles up here.
    document.addEventListener("click", onClick, true)
    window.addEventListener("popstate", start)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", start)
      clear()
    }
  }, [])

  // The new page is showing.
  useEffect(() => finishRef.current(), [pathname])

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {value !== null ? (
        <Progress
          value={value}
          aria-label="Loading page"
          className="gap-0 **:data-[slot=progress-indicator]:bg-cyan-accent **:data-[slot=progress-indicator]:shadow-[0_0_10px_var(--cyan-accent),0_0_3px_var(--cyan-accent)] **:data-[slot=progress-indicator]:duration-200 **:data-[slot=progress-indicator]:ease-out **:data-[slot=progress-track]:h-[3px] **:data-[slot=progress-track]:rounded-none **:data-[slot=progress-track]:bg-transparent"
        />
      ) : null}
    </div>
  )
}
