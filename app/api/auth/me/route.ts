import { NextResponse } from "next/server"
import { getUserByAccessToken, refreshAccessToken } from "@/lib/supabase/server"

function parseCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null
  const pairs = cookieHeader.split(";")
  for (const pair of pairs) {
    const [k, ...v] = pair.split("=")
    if (!k) continue
    const key = k.trim()
    if (key === name) return decodeURIComponent(v.join("=").trim())
  }
  return null
}

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || ""
  const accessToken = parseCookie(cookieHeader, "ezfinance-access-token")
  const refreshToken = parseCookie(cookieHeader, "ezfinance-refresh-token")

  // try access token first
  const user = await getUserByAccessToken(accessToken)
  if (user) {
    return NextResponse.json({ user })
  }

  // attempt to refresh
  if (refreshToken) {
    const payload = await refreshAccessToken(refreshToken)
    if (payload && (payload as any).access_token) {
      const response = NextResponse.json({ user: (payload as any).user ?? null })

      // set cookies (httpOnly) on the response so the browser receives them
      response.cookies.set("ezfinance-access-token", (payload as any).access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: (payload as any).expires_in ?? 60 * 60,
      })

      if ((payload as any).refresh_token) {
        response.cookies.set("ezfinance-refresh-token", (payload as any).refresh_token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        })
      }

      return response
    }
  }

  return NextResponse.json({ user: null })
}
