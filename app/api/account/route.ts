import {
  clearAuthCookies,
  createSupabaseAdminClient,
  createSupabaseRouteClient,
  getSessionUser,
  signOutUser,
} from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/** Saves account preferences on the user's Supabase profile. */
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => null)
  const data: Record<string, unknown> = {}
  if (typeof body?.emailTips === "boolean") data.email_tips = body.emailTips
  if (body?.reportStorage === "local" || body?.reportStorage === "cloud") {
    data.report_storage = body.reportStorage
  }
  if (!Object.keys(data).length) {
    return NextResponse.json(
      {
        error:
          "Send emailTips (true or false) or reportStorage (local or cloud).",
      },
      { status: 400 }
    )
  }

  const supabase = await createSupabaseRouteClient()
  const { error } = await supabase.auth.updateUser({ data })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({
    emailTips: body.emailTips,
    reportStorage: body.reportStorage,
  })
}

/** Permanently deletes the signed-in user's account. */
export async function DELETE() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      )
    }

    // Sign out first so the session cookies are cleared the normal way.
    await signOutUser()
    const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(
      user.id
    )
    if (error) {
      console.error("Account deletion failed", error)
      return NextResponse.json(
        {
          error:
            "We couldn't delete your account. Please sign in and try again.",
        },
        { status: 500 }
      )
    }

    return clearAuthCookies(NextResponse.json({ deleted: true }))
  } catch (error) {
    console.error("Account deletion error", error)
    return NextResponse.json(
      { error: "Unable to delete account." },
      { status: 500 }
    )
  }
}
