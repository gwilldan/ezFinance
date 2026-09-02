"use client"

import { useEffect, useState } from "react"

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Processing sign in...")

  useEffect(() => {
    async function handle() {
      try {
        // Support tokens in fragment (#...) and in query (?access_token=...)
        const hash = window.location.hash || ""
        const search = window.location.search || ""

        const fragParams = new URLSearchParams(hash.replace(/^#/, ""))
        const queryParams = new URLSearchParams(search.replace(/^\?/, ""))

        const access_token = fragParams.get("access_token") || queryParams.get("access_token")
        const refresh_token = fragParams.get("refresh_token") || queryParams.get("refresh_token")
        const expires_in = fragParams.get("expires_in") || queryParams.get("expires_in")

        console.log("Auth callback received params:", { access_token, refresh_token, expires_in })

        if (!access_token) {
          setMessage("No access token found in callback.")
          return
        }

        setMessage("Exchanging token with server...")

        const resp = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token, refresh_token, expires_in: expires_in ? Number(expires_in) : undefined }),
        })

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          setMessage(err?.error ?? "Failed to create session")
          console.error("/api/auth/session error", err)
          return
        }

        const body = await resp.json().catch(() => ({}))
        try {
          if (body?.user) {
            // persist a minimal user object for UI convenience
            try {
              localStorage.setItem('user', JSON.stringify({ id: body.user.id, name: body.user.email ?? null, email: body.user.email }))
            } catch (e) {
              console.warn('Failed to persist user', e)
            }
            // notify any listeners
            try { window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: body.user } })) } catch(e){}
          }
        } catch (e) {
          // ignore
        }

        // session cookies set — navigate to root and replace history so tokens are not visible
        window.history.replaceState({}, document.title, "/")
        window.location.replace("/")
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Unexpected error")
        console.error(e)
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
