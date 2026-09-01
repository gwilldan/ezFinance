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
    (process.env.SUPABASE_DB_URI
      ? deriveSupabaseUrlFromDbUri(process.env.SUPABASE_DB_URI)
      : null)

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
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
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
    payload.error_description ??
    payload.msg ??
    payload.message ??
    payload.error ??
    "Authentication request failed."
  )
}

export function createSessionResponse(
  payload: SupabaseAuthPayload,
  fallbackMessage: string
) {

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

  console.log({accessToken: payload.access_token, refreshToken: payload.refresh_token})

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
