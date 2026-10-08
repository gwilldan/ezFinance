import { getCloudReport } from "@/lib/reports/server"
import { getUserByAccessToken } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/** One of the signed-in user's cloud reports, with its chat. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserByAccessToken()
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    )
  }

  try {
    const saved = await getCloudReport(user.id, (await params).id)
    if (!saved) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 })
    }
    return NextResponse.json(saved)
  } catch (error) {
    console.error("Report lookup error", error)
    return NextResponse.json(
      { error: "Unable to load this report." },
      { status: 500 }
    )
  }
}
