import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerConfig } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      redirectTo?: string
    }
    const { url } = getSupabaseServerConfig()
    // redirect to a client callback that will post the tokens to the server
    const redirectTo = body.redirectTo ?? `${request.nextUrl.origin}/auth/callback`
    const authUrl = new URL(`${url}/auth/v1/authorize`)

    authUrl.searchParams.set("provider", "google")
    // request token response so Supabase returns tokens in the URL fragment
    authUrl.searchParams.set("response_type", "token")
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
