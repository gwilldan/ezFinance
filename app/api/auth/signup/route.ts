import { NextResponse } from "next/server"
import { getEmailSignInMethods, signUpWithEmail } from "@/lib/supabase/server"

/**
 * Tells someone their email already has an account, and how to get into it.
 * Supabase hides this by default; we show it so nobody ends up with two
 * accounts or waits for a confirmation email that never comes.
 */
function emailTakenResponse(methods: string[]) {
  const google = methods.includes("google") && !methods.includes("email")
  return NextResponse.json(
    {
      code: "email_taken",
      signInWith: google ? "google" : "password",
      error: google
        ? "This email is already linked to a Google account. Continue with Google to sign in."
        : "An account with this email already exists. Sign in instead.",
    },
    { status: 409 }
  )
}

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

    // Checked first so the account is never created twice. If the lookup
    // fails, sign-up still runs and Supabase's own duplicate checks apply.
    const methods = await getEmailSignInMethods(email).catch((error) => {
      console.error("Signup email check failed", error)
      return []
    })
    if (methods.length) return emailTakenResponse(methods)

    const { data, error } = await signUpWithEmail(email, password, name)

    if (error?.code === "user_already_exists") {
      return emailTakenResponse(["email"])
    }
    // With email confirmation on, Supabase answers a taken email with a
    // placeholder user that has no identities instead of an error.
    if (!error && data.user && data.user.identities?.length === 0) {
      return emailTakenResponse(["email"])
    }

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to create account." },
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
