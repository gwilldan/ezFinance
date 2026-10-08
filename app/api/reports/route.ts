import { deleteReports } from "@/lib/reports/server"
import { getSessionUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/** Deletes every cloud report, and every report location, the user has saved. */
export async function DELETE() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    )
  }

  try {
    await deleteReports(user.id)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Report deletion error", error)
    return NextResponse.json(
      { error: "We couldn't delete your saved reports." },
      { status: 500 }
    )
  }
}
