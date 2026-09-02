import { NextResponse } from "next/server"
import { clearAuthCookies, signOutUser } from "@/lib/supabase/server"

export async function POST() {
  try {
    const { error } = await signOutUser()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })
    return clearAuthCookies(response)
  } catch (error) {
    console.error("Sign out route error", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to sign out.",
      },
      { status: 500 }
    )
  }
}
