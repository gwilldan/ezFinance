import { NextResponse } from "next/server"
import { getUserByAccessToken, createSessionResponse } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
    }

    const accessToken = body.access_token
    const refreshToken = body.refresh_token
    const expiresIn = body.expires_in

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access_token" }, { status: 400 })
    }

    // get the user associated with this access token
    const user = await getUserByAccessToken(accessToken)

    const payload = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      user: user ? { id: (user as any).id, email: (user as any).email, user_metadata: (user as any).user_metadata } : undefined,
    }

    // createSessionResponse will set httpOnly cookies on the response
    return createSessionResponse(payload as any, "Signed in successfully.")
  } catch (error) {
    console.error("session route error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create session" }, { status: 500 })
  }
}
