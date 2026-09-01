import { NextResponse } from "next/server"
import {
  callSupabaseAuth,
  createSessionResponse,
  getSupabaseAuthError,
} from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string
      password?: string
    }
    const email = body.email?.trim()
    const password = body.password

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      )
    }

    const { ok, status, payload } = await callSupabaseAuth(
      "token?grant_type=password",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    )

    if (!ok) {
      return NextResponse.json(
        { error: getSupabaseAuthError(payload) },
        { status }
      )
    }

    return createSessionResponse(payload, "Signed in successfully.")
  } catch (error) {
    console.error("Login route error", error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 500 }
    )
  }
}
