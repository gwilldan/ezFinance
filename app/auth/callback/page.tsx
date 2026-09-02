"use client"

import { useEffect } from "react"

export default function AuthCallbackPage() {
  useEffect(() => {
    let cancelled = false

    async function handle() {
      try {
        const hash = window.location.hash || ""
        const search = window.location.search || ""

        const fragParams = new URLSearchParams(hash.replace(/^#/, ""))
        const queryParams = new URLSearchParams(search.replace(/^\?/, ""))

        const access_token = fragParams.get("access_token") || queryParams.get("access_token")
        const refresh_token = fragParams.get("refresh_token") || queryParams.get("refresh_token")
        const expires_in = fragParams.get("expires_in") || queryParams.get("expires_in")

        const error = queryParams.get('error') || fragParams.get('error')
        if (error && !access_token) {
          console.error('OAuth error on callback', { error, description: queryParams.get('error_description') || fragParams.get('error_description') })
          return
        }

        if (!access_token) {
          console.error('No access token found on callback')
          return
        }

        // exchange tokens with server and wait for the response to complete
        const resp = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token, refresh_token, expires_in: expires_in ? Number(expires_in) : undefined }),
          credentials: 'same-origin',
        })

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          console.error('/api/auth/session error', err)
          return
        }

        // ensure browser had time to apply Set-Cookie headers — small delay improves reliability
        await new Promise((res) => setTimeout(res, 300))

        if (cancelled) return

        // Replace history and navigate to root (full reload)
        window.history.replaceState({}, document.title, "/")
        window.location.replace("/")
      } catch (e) {
        console.error('Auth callback unexpected error', e)
      }
    }

    handle()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
