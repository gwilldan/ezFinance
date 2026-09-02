import { NextRequest, NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = request.nextUrl.searchParams.get("next") ?? "/"

  if (!code) {
    return NextResponse.redirect(new URL("/?error=oauth", request.url))
  }

  const supabase = await createSupabaseRouteClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("Supabase OAuth callback exchange failed:", error.message)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  return NextResponse.redirect(new URL(next, request.url))
}
