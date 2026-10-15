import { isProductKey, PRODUCTS, verifyWebhook } from "@/lib/billing/bachs"
import {
  addOneTimeReports,
  findUserIdBySubscription,
  setPlan,
} from "@/lib/billing/grant"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

type BachsEvent = {
  id: string
  type: string
  data: Record<string, unknown>
}

type CheckoutCompleted = {
  payment_status: "paid" | "no_payment_required"
  metadata: { user_id?: string; product?: string; ref?: string } | null
  subscription: { subscription_id: string } | null
}

type SubscriptionChanged = {
  subscription_id: string
  status: string
}

/** Subscription statuses that end paid access. */
const ENDED = ["canceled", "unpaid"]

/**
 * Bachs webhooks: the only place purchases are granted. Bachs delivers at
 * least once and retries on 5xx, so each event is recorded and run once.
 */
export async function POST(request: Request) {
  // The signature covers the raw bytes, so read them before parsing.
  const rawBody = await request.text()
  if (!verifyWebhook(rawBody, request.headers.get("x-bachs-signature-v2"))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as BachsEvent
  const events = createSupabaseAdminClient().from("billing_events")

  const { error } = await events.insert({ id: event.id, type: event.type })
  // 23505: unique violation, so this event was already handled.
  if (error?.code === "23505") return NextResponse.json({ received: true })
  if (error) {
    console.error("Webhook event insert failed", error)
    return NextResponse.json({ error: "Try again." }, { status: 500 })
  }

  let grantedRef: string | undefined
  try {
    grantedRef = await handle(event)
  } catch (handleError) {
    // Forget the event so Bachs's retry runs it again.
    await events.delete().eq("id", event.id)
    console.error(`Bachs ${event.type} failed`, handleError)
    return NextResponse.json({ error: "Try again." }, { status: 500 })
  }

  // Lets the buyer's settings page see the grant. Outside the try: failing
  // here must not forget the event, or the retry would grant it twice.
  if (grantedRef) {
    const { error: refError } = await events
      .update({ checkout_ref: grantedRef })
      .eq("id", event.id)
    if (refError) console.error("Checkout ref save failed", refError)
  }
  return NextResponse.json({ received: true })
}

/** Runs one event; returns the checkout ref when it granted a purchase. */
async function handle(event: BachsEvent): Promise<string | undefined> {
  switch (event.type) {
    case "checkout.completed": {
      const data = event.data as CheckoutCompleted
      const userId = data.metadata?.user_id
      const product = data.metadata?.product
      if (data.payment_status !== "paid" || !userId || !isProductKey(product)) {
        return
      }

      const item = PRODUCTS[product]
      if ("plan" in item) {
        await setPlan(userId, item.plan, data.subscription?.subscription_id)
      } else {
        await addOneTimeReports(userId)
      }
      return data.metadata?.ref
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const data = event.data as SubscriptionChanged
      const ended =
        event.type === "customer.subscription.deleted" ||
        ENDED.includes(data.status)
      if (!ended) return

      // Only the account's current subscription moves it back to Free.
      const userId = await findUserIdBySubscription(data.subscription_id)
      if (userId) await setPlan(userId, "free")
    }
  }
}
