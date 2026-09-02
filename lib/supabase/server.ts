import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
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
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL ??
    (process.env.SUPABASE_DB_URI ? deriveSupabaseUrlFromDbUri(process.env.SUPABASE_DB_URI) : null)

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
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

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const { url, key } = getSupabaseServerConfig()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createSupabaseServerClient()
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const supabase = await createSupabaseServerClient()
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
    },
  })
}

export function getSupabaseAuthError(payload: SupabaseAuthPayload) {
  return payload.error_description ?? payload.msg ?? payload.message ?? payload.error ?? "Authentication request failed."
}

export async function getUserByAccessToken(accessToken?: string | null) {
  void accessToken
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) return null
  return data.user
}

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) return null
  return data.user
}

export async function refreshAccessToken(refreshToken?: string | null) {
  void refreshToken
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken ?? "" })

  if (error || !data.session) return null

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: data.user ?? undefined,
  } as SupabaseAuthPayload
}

export function createSessionResponse(payload: SupabaseAuthPayload, fallbackMessage: string) {
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
