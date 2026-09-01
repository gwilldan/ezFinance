import { NextResponse } from "next/server"
import {
  callSupabaseAuth,
  createSessionResponse,
  getSupabaseAuthError,
} from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string
      email?: string
      password?: string
      confirmPassword?: string
    }
    const name = body.name?.trim()
    const email = body.email?.trim()
    const password = body.password
    const confirmPassword = body.confirmPassword

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Name, email, password, and confirm password are required." },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      )
    }

    const { ok, status, payload } = await callSupabaseAuth("signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name: name,
        },
      }),
    })

    if (!ok) {
      return NextResponse.json(
        { error: getSupabaseAuthError(payload) },
        { status }
      )
    }

    return createSessionResponse(
      payload,
      payload.access_token
        ? "Account created and signed in successfully."
        : "Account created. Check your email to confirm your account."
    )
  } catch (error) {
    console.error("Signup route error", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create account.",
      },
      { status: 500 }
    )
  }
}
