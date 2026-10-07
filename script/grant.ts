/**
 * Grants a plan or one-time report credits to an account, until checkout
 * exists.
 *
 *   npm run grant -- someone@example.com pro
 *   npm run grant -- someone@example.com business
 *   npm run grant -- someone@example.com free
 *   npm run grant -- someone@example.com report      # one one-time report
 *   npm run grant -- someone@example.com report 3    # three of them
 */
import {
  addOneTimeReports,
  findUserIdByEmail,
  setPlan,
} from "@/lib/billing/grant"
import { getUsageSummary } from "@/lib/billing/usage"
import type { PlanId } from "@/lib/pricing"

const PLANS: PlanId[] = ["free", "pro", "business"]
const [email, grant, quantityArg] = process.argv.slice(2)

if (
  !email ||
  !grant ||
  (!PLANS.includes(grant as PlanId) && grant !== "report")
) {
  console.error(
    "Usage: npm run grant -- <email> <free|pro|business|report> [quantity]"
  )
  process.exit(1)
}

const userId = await findUserIdByEmail(email)
if (!userId) {
  console.error(`No account found for ${email}`)
  process.exit(1)
}

if (grant === "report") {
  const quantity = Number(quantityArg ?? 1)
  if (!Number.isInteger(quantity) || quantity < 1) {
    console.error("Quantity must be a whole number of at least 1.")
    process.exit(1)
  }
  await addOneTimeReports(userId, quantity)
  console.log(`Added ${quantity} one-time report(s) to ${email}.`)
} else {
  await setPlan(userId, grant as PlanId)
  console.log(`${email} is now on the ${grant} plan.`)
}

console.log(await getUsageSummary(userId))
