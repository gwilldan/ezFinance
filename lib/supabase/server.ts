import { NextResponse } from "next/server"

export type SupabaseAuthSession = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

export type SupabaseAuthPayload = SupabaseAuthSession & {
  user?: {
    id?: string
    email?: string
    user_metadata?: Record<string, unknown>
  }
  error?: string
  error_description?: string
  msg?: string
  message?: string
}

function deriveSupabaseUrlFromDbUri(dbUri: string) {
  try {
    const parsedUri = new URL(dbUri)
    const hostParts = parsedUri.hostname.split(".")

    if (hostParts[0] === "db" && hostParts[1]) {
      return `https://${hostParts[1]}.supabase.co`
    }

    const usernameParts = decodeURIComponent(parsedUri.username).split(".")

    if (usernameParts[1] && parsedUri.hostname.includes("supabase")) {
      return `https://${usernameParts[1]}.supabase.co`
    }
  } catch {
    return null
  }

  return null
}

export function getSupabaseServerConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL ??
    (process.env.SUPABASE_DB_URI ? deriveSupabaseUrlFromDbUri(process.env.SUPABASE_DB_URI) : null)

  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase server auth config is missing.")
  }

  return {
    url: supabaseUrl.replace(/\/$/, ""),
    key: supabaseKey,
  }
}

export async function callSupabaseAuth(
  path: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; payload: SupabaseAuthPayload }> {
  const { url, key } = getSupabaseServerConfig()
  const response = await fetch(`${url}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      // allow the caller to pass custom headers via init.headers (e.g. Authorization)
      ...(init.headers as Record<string, string> | undefined),
      "Content-Type": "application/json",
    },
  })
  const payload = (await response.json().catch(() => ({}))) as SupabaseAuthPayload

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}

export function getSupabaseAuthError(payload: SupabaseAuthPayload) {
  return (
    payload.error_description ?? payload.msg ?? payload.message ?? payload.error ?? "Authentication request failed."
  )
}

/**
 * Given an access token, return the Supabase user object or null.
 * This performs a server-side call to /auth/v1/user using the provided access token.
 */
export async function getUserByAccessToken(accessToken?: string | null) {
  if (!accessToken) return null
  const { url, key } = getSupabaseServerConfig()
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: key,
      },
      cache: "no-store",
    })
    if (!res.ok) return null
    const user = (await res.json().catch(() => null)) as any
    return user
  } catch (e) {
    return null
  }
}

/**
 * Refresh access token using the refresh token.
 * Returns the auth payload from Supabase (access_token, refresh_token, user, expires_in) or null.
 */
export async function refreshAccessToken(refreshToken?: string | null) {
  if (!refreshToken) return null
  const { url, key } = getSupabaseServerConfig()
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    })
    if (!res.ok) return null
    const payload = (await res.json().catch(() => null)) as SupabaseAuthPayload | null
    return payload
  } catch (e) {
    return null
  }
}

export function createSessionResponse(payload: SupabaseAuthPayload, fallbackMessage: string) {
  console.log("returing session response")

  const response = NextResponse.json({
    message: fallbackMessage,
    user: payload.user
      ? {
          id: payload.user.id,
          email: payload.user.email,
          userMetadata: payload.user.user_metadata,
        }
      : null,
  })

  console.log("from the create session response: ", "=".repeat(20))
  console.log({payload})

  if (payload.access_token) {
    response.cookies.set("ezfinance-access-token", payload.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: payload.expires_in ?? 60 * 60,
    })
  }

  if (payload.refresh_token) {
    response.cookies.set("ezfinance-refresh-token", payload.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return response
}
