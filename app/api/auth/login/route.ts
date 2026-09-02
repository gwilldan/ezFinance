import { NextResponse } from "next/server"
import { getSupabaseAuthError, signInWithPassword } from "@/lib/supabase/server"

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

    const { data, error } = await signInWithPassword(email, password)

    if (error) {
      return NextResponse.json(
        { error: getSupabaseAuthError({ error: error.message } as any) },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: "Signed in successfully.",
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            userMetadata: data.user.user_metadata,
          }
        : null,
    })
  } catch (error) {
    console.error("Login route error", error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 500 }
    )
  }
}
