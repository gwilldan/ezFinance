import { getUsageSummary } from "@/lib/billing/usage"
import { getSessionUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/** The signed-in account's plan, allowance and what's left. */
export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    )
  }
  return NextResponse.json(await getUsageSummary(user.id))
}
