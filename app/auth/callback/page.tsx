"use client"

import { useEffect, useState } from "react"

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Processing sign in...")

  useEffect(() => {
    async function handle() {
      try {
        const hash = window.location.hash || ""
        // parse fragment like #access_token=...&refresh_token=...&expires_in=...
        const params = new URLSearchParams(hash.replace(/^#/, ""))
        const access_token = params.get("access_token")
        const refresh_token = params.get("refresh_token")
        const expires_in = params.get("expires_in")

        if (!access_token) {
          setMessage("No access token found in callback.")
          return
        }

        const resp = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token, refresh_token, expires_in: expires_in ? Number(expires_in) : undefined }),
        })

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          setMessage(err?.error ?? "Failed to create session")
          return
        }

        // session cookies set — navigate to root and replace history so tokens are not visible
        window.history.replaceState({}, document.title, "/")
        window.location.replace("/")
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Unexpected error")
      }
    }

    handle()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="rounded-lg bg-white p-8 shadow">{message}</div>
    </main>
  )
}
