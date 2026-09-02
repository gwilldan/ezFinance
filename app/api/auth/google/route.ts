import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const redirectTo = `${request.nextUrl.origin}/api/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.url) {
      return NextResponse.json({ error: "Google signup URL was not created." }, { status: 400 })
    }

    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error("Google OAuth start failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Google sign in.",
      },
      { status: 500 }
    )
  }
}
