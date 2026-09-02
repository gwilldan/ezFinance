import { NextResponse } from "next/server"

function buildCallbackPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signing in…</title>
  </head>
  <body>
    <script>
      (() => {
        try {
          const hash = location.hash || ''
          const search = location.search || ''
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
          const queryParams = new URLSearchParams(search.replace(/^\?/, ''))

          const access_token = hashParams.get('access_token') || queryParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token')
          const expires_in = hashParams.get('expires_in') || queryParams.get('expires_in')
          const error = hashParams.get('error') || queryParams.get('error')

          if (error || !access_token) {
            window.location.replace('/')
            return
          }

          fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              access_token,
              refresh_token,
              expires_in: expires_in ? Number(expires_in) : undefined,
            }),
          })
            .then(async (res) => {
              if (!res.ok) {
                console.error('session exchange failed', await res.text())
              }
              window.history.replaceState({}, '', '/')
              window.location.replace('/')
            })
            .catch(() => {
              window.location.replace('/')
            })
        } catch (err) {
          console.error('auth callback script failed', err)
          window.location.replace('/')
        }
      })()
    </script>
  </body>
</html>`
}

export async function GET() {
  return new NextResponse(buildCallbackPage(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(request: Request) {
  // Fallback for clients that POST tokens directly. This is used when a browser or client cannot
  // safely keep the hash in the URL, but the main OAuth callback uses the GET page above.
  try {
    const body = (await request.json().catch(() => ({}))) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
    }
    const access_token = body.access_token
    const refresh_token = body.refresh_token

    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 })
    }

    const payload = {
      access_token,
      refresh_token,
      expires_in: body.expires_in,
      user: undefined,
    }

    return fetch(new URL('/api/auth/session', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('auth callback post error', error)
    return NextResponse.json({ error: 'Unable to finish auth callback' }, { status: 500 })
  }
}