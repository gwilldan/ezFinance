import { NextResponse } from "next/server"
import { getSupabaseAuthError, signUpWithEmail } from "@/lib/supabase/server"

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

    const { data, error } = await signUpWithEmail(email, password, name)

    if (error) {
      return NextResponse.json(
        { error: getSupabaseAuthError({ error: error.message } as any) },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: data.session
        ? "Account created and signed in successfully."
        : "Account created. Check your email to confirm your account.",
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            userMetadata: data.user.user_metadata,
          }
        : null,
    })
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
