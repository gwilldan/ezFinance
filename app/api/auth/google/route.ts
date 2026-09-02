import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerConfig } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      redirectTo?: string
    }
    const { url } = getSupabaseServerConfig()
    // redirect to a server callback endpoint that will read the token hash in the browser and then exchange it for the session cookie
    const redirectTo = body.redirectTo ?? `${request.nextUrl.origin}/auth/callback`
    const authUrl = new URL(`${url}/auth/v1/authorize`)

    authUrl.searchParams.set("provider", "google")
    // Let Supabase manage response_type/state. Only set redirect_to to our client callback.
    authUrl.searchParams.set("redirect_to", redirectTo)

    return NextResponse.json({ url: authUrl.toString() })
  } catch (error) {
    console.error("Google auth route error", error)

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
