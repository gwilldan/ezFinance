// Prices and limits are placeholders until billing is wired up.
export const CONTACT_EMAIL = "contact@gwilldan.xyz"

export type Plan = {
  name: string
  price: string
  period?: string
  annual?: string
  description: string
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

export const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Try ezFinance on a real statement.",
    features: [
      "One free statement analysis",
      "Up to 10 PDF pages",
      "AI categorization into 16 categories",
      "Balance chart and spending breakdown",
      "Totals checked against your statement’s balances",
    ],
    cta: { label: "Start free", href: "/" },
    badge: "Start here",
  },
  {
    name: "One-time report",
    price: "$4.99",
    period: "/report",
    description: "Pay once for one uploaded statement.",
    features: [
      "Every transaction in that report",
      "AI assistant for that statement",
      "No subscription and no renewal",
    ],
    cta: {
      label: "Unlock a report",
      href: contact("ezFinance one-time report"),
    },
    badge: "Pay once",
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    annual: "or $144/year, save 37%",
    description: "For keeping an eye on your money every month.",
    features: [
      "100 pages per billing cycle",
      "Unlimited transactions per report",
      "AI assistant on every report",
      "Recurring charge detection",
      "Savings recommendations",
      "Password-protected statements",
      "Priority support",
    ],
    cta: { label: "Get Pro", href: contact("ezFinance Pro") },
    badge: "Most popular",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    annual: "or $372/year, save 37%",
    description: "For accountants and consultants with many clients.",
    features: [
      "500 pages per billing cycle",
      "Everything in Pro",
      "Built for client statement reviews",
      "Dedicated support",
    ],
    cta: { label: "Talk to us", href: contact("ezFinance Business") },
    badge: "For teams",
  },
]

export const FAQS = [
  {
    question: "Is the free plan really free?",
    answer:
      "Yes. Your first statement analysis is free, with no card required. Upgrade only if you need more pages or reports.",
  },
  {
    question: "What counts as a page?",
    answer:
      "Each page of the PDF statement you upload. A 12-page statement uses 12 pages of your allowance.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Plans renew monthly or yearly and you can cancel whenever you like. One-time reports never renew.",
  },
  {
    question: "Do you store my bank statements?",
    answer:
      "No. Your PDF is read in memory to build the report and then discarded, and statement passwords are never saved. Your latest report stays in your browser until you close the tab or clear it in Settings.",
  },
]
