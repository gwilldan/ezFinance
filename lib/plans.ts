import {
  formatPrice,
  PRICING,
  yearlySaving,
  type Allowance,
} from "@/lib/pricing"

// Display copy for the pricing board. Numbers come from lib/pricing.ts.

export const CONTACT_EMAIL = "contact@gwilldan.xyz"

export type Plan = {
  name: string
  price: string
  period?: string
  annual?: string
  description: string
  /** What the plan includes, shown as chips under the price. */
  allowance: string[]
  /** Pay-as-you-go pricing past the allowance, when the plan has it. */
  overage?: string
  features: string[]
  cta: { label: string; href: string }
  /** Short pill shown on the plan, e.g. "Most popular". */
  badge: string
  highlighted?: boolean
}

const contact = (subject: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`

/** Until there's a waitlist backend, joining is an email with the product in the subject. */
export const waitlistHref = (product: string) =>
  contact(`ezFinance ${product} waitlist`)

/** Where upgrade prompts send people until checkout exists. */
export const upgradeHref = (plan: string) => contact(`ezFinance ${plan}`)

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`

function allowanceCopy({ reports, agentCalls }: Allowance, suffix = "") {
  return [
    `${plural(reports, "report")}${suffix}`,
    `${plural(agentCalls, "AI assistant question")}${suffix}`,
  ]
}

const { free, oneTimeReport, pro, business } = PRICING
const { perReport, perAgentCallBlock } = business.overage

export const PLANS: Plan[] = [
  {
    name: "Free",
    price: formatPrice(0),
    period: "/month",
    description: "Try ezFinance on a real statement.",
    allowance: allowanceCopy(free.allowance),
    features: [
      "AI categorization into 16 categories",
      "Balance chart and spending breakdown",
      "Totals checked against your statement’s balances",
    ],
    cta: { label: "Start free", href: "/" },
    badge: "Start here",
  },
  {
    name: "One-time report",
    price: formatPrice(oneTimeReport.price),
    period: "/report",
    description: "Pay once for one more statement. Use it whenever you like.",
    allowance: allowanceCopy(oneTimeReport.credits),
    features: [
      "Every transaction in that report",
      "Credits never expire",
      "No subscription and no renewal",
    ],
    cta: { label: "Unlock a report", href: upgradeHref("one-time report") },
    badge: "Pay once",
  },
  {
    name: "Pro",
    price: formatPrice(pro.monthly),
    period: "/month",
    annual: `or ${formatPrice(pro.yearly)}/year, save ${yearlySaving(pro)}%`,
    description: "For keeping an eye on your money every month.",
    allowance: allowanceCopy(pro.allowance, " a month"),
    features: [
      "Recurring charge detection",
      "Savings recommendations",
      "Password-protected statements",
      "Priority support",
    ],
    cta: { label: "Get Pro", href: upgradeHref("Pro") },
    badge: "Most popular",
    highlighted: true,
  },
  {
    name: "Business",
    price: formatPrice(business.monthly),
    period: "/month",
    annual: `or ${formatPrice(business.yearly)}/year, save ${yearlySaving(business)}%`,
    description: "For accountants and consultants with many clients.",
    allowance: allowanceCopy(business.allowance, " a month"),
    overage: `Then ${formatPrice(perReport)} per extra report and ${formatPrice(perAgentCallBlock.price)} per ${perAgentCallBlock.calls} extra questions`,
    features: [
      "Everything in Pro",
      "Keeps working past your allowance",
      "Dedicated support",
    ],
    cta: { label: "Talk to us", href: upgradeHref("Business") },
    badge: "For teams",
  },
]

export const FAQS = [
  {
    question: "Is the free plan really free?",
    answer: `Yes. Every account gets ${plural(free.allowance.reports, "statement report")} and ${plural(free.allowance.agentCalls, "AI assistant question")} free, with no card required.`,
  },
  {
    question: "What counts as a report?",
    answer:
      "Each statement you upload and analyze is one report, however many pages it has. If an upload fails, it doesn’t count.",
  },
  {
    question: "What is an AI assistant question?",
    answer:
      "Each question you ask the assistant about your statement. Answers come from your actual transactions.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Plans renew monthly or yearly and you can cancel whenever you like. One-time reports never renew, and their credits never expire.",
  },
  {
    question: "Do you store my bank statements?",
    answer:
      "No. Your PDF is read in memory to build the report and then discarded, and statement passwords are never saved. Your latest report stays in your browser until you close the tab or clear it in Settings.",
  },
]
