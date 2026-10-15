import type { PlanId } from "@/lib/pricing"
import { createHmac, timingSafeEqual } from "node:crypto"

/*
 * Bachs checkout (https://docs.bachs.io). A purchase starts at /api/checkout,
 * which redirects to a hosted checkout; /api/webhooks/bachs grants it once
 * Bachs confirms the payment.
 */

/** What can be bought, and the Bachs product behind each. */
export const PRODUCTS = {
  report: { productId: process.env.BACHS_PRODUCT_REPORT },
  pro_monthly: {
    productId: process.env.BACHS_PRODUCT_PRO_MONTHLY,
    plan: "pro",
  },
  pro_yearly: { productId: process.env.BACHS_PRODUCT_PRO_YEARLY, plan: "pro" },
  business_monthly: {
    productId: process.env.BACHS_PRODUCT_BUSINESS_MONTHLY,
    plan: "business",
  },
  business_yearly: {
    productId: process.env.BACHS_PRODUCT_BUSINESS_YEARLY,
    plan: "business",
  },
} satisfies Record<string, { productId?: string; plan?: PlanId }>

export type ProductKey = keyof typeof PRODUCTS

export const isProductKey = (value: unknown): value is ProductKey =>
  typeof value === "string" && Object.hasOwn(PRODUCTS, value)

/** Creates a hosted checkout and returns its URL. */
export async function createCheckout({
  product,
  userId,
  email,
}: {
  product: ProductKey
  userId: string
  email: string
}) {
  const { productId } = PRODUCTS[product]
  if (!productId) throw new Error(`No Bachs product configured for ${product}.`)

  const site = process.env.NEXT_PUBLIC_SITE_URL
  const response = await fetch(
    `${process.env.BACHS_API_URL}/v1/checkout-sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BACHS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email },
        // Comes back on the webhook, so it knows whom to grant and what.
        metadata: { user_id: userId, product },
        success_url: `${site}/settings?checkout=success`,
        cancel_url: `${site}/pricing`,
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Bachs checkout failed: ${await response.text()}`)
  }
  const { checkout_url } = (await response.json()) as { checkout_url: string }
  return checkout_url
}

/**
 * Checks the X-Bachs-Signature-V2 header, "t=<unix>,v1=<hex>[,v1=<hex>]", an
 * HMAC-SHA256 of "<t>.<raw body>". Several v1 values arrive while the secret
 * rotates; any match passes. Deliveries older than five minutes are refused.
 */
export function verifyWebhook(rawBody: string, header: string | null) {
  const secret = process.env.BACHS_WEBHOOK_SECRET
  if (!secret || !header) return false

  const pairs = header.split(",").map((part) => {
    const index = part.indexOf("=")
    return [part.slice(0, index).trim(), part.slice(index + 1).trim()]
  })
  const timestamp = Number(pairs.find(([key]) => key === "t")?.[1])
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return false

  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")
  )
  return pairs.some(([key, value]) => {
    if (key !== "v1") return false
    const actual = Buffer.from(value)
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    )
  })
}
