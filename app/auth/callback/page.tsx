"use client"

import { useEffect } from "react"

export default function AuthCallbackPage() {
  useEffect(() => {
    let cancelled = false

    async function handle() {
      try {
        const hash = window.location.hash || ""
        const search = window.location.search || ""
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""))
        const queryParams = new URLSearchParams(search.replace(/^\?/, ""))

        const access_token = hashParams.get("access_token") || queryParams.get("access_token")
        const refresh_token = hashParams.get("refresh_token") || queryParams.get("refresh_token")
        const expires_in = hashParams.get("expires_in") || queryParams.get("expires_in")
        const error = hashParams.get("error") || queryParams.get("error")

        if (error && !access_token) {
          console.error("OAuth callback error", {
            error,
            description:
              hashParams.get("error_description") || queryParams.get("error_description"),
          })
          window.location.replace("/")
          return
        }

        if (!access_token) {
          window.location.replace("/")
          return
        }

        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            access_token,
            refresh_token,
            expires_in: expires_in ? Number(expires_in) : undefined,
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          console.error("session exchange failed", err)
          window.location.replace("/")
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 250))

        if (cancelled) return
        window.history.replaceState({}, document.title, "/")
        window.location.replace("/")
      } catch (error) {
        console.error("Auth callback failed", error)
        window.location.replace("/")
      }
    }

    handle()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
