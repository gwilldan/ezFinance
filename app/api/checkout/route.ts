import { createCheckout, isProductKey } from "@/lib/billing/bachs"
import { getSessionUser } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

/** Starts a Bachs checkout for ?product= and redirects the browser to it. */
export async function GET(request: NextRequest) {
  const product = request.nextUrl.searchParams.get("product")
  if (!isProductKey(product)) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 })
  }

  const user = await getSessionUser()
  if (!user?.email) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const checkoutUrl = await createCheckout({
      product,
      userId: user.id,
      email: user.email,
    })
    return NextResponse.redirect(checkoutUrl, 303)
  } catch (error) {
    console.error("Checkout failed", error)
    return NextResponse.json(
      { error: "Couldn’t start checkout. Please try again." },
      { status: 502 }
    )
  }
}
