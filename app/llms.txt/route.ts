import { CONTACT_EMAIL, FAQS, PLANS } from "@/lib/plans"
import { SITE_NAME, SITE_SUMMARY, SITE_TAGLINE, SITE_URL } from "@/lib/site"

/**
 * A plain-text guide to the site for AI assistants (https://llmstxt.org).
 * Built from the same plans and FAQs as the pricing page, so it stays current.
 */
export function GET() {
  const url = (path: string) => new URL(path, SITE_URL).href

  const plans = PLANS.map((plan) =>
    [
      `### ${plan.name}: ${plan.price}${plan.period ?? ""}`,
      plan.yearly
        ? `Or ${plan.yearly.price}/year, saving ${plan.yearly.saving}%.`
        : null,
      plan.description,
      ...[...plan.allowance, ...plan.features].map((item) => `- ${item}`),
      plan.overage ? `- ${plan.overage}` : null,
    ]
      .filter(Boolean)
      .join("\n")
  ).join("\n\n")

  const faqs = FAQS.map(
    ({ question, answer }) => `### ${question}\n${answer}`
  ).join("\n\n")

  const body = `# ${SITE_NAME}

> ${SITE_TAGLINE}. ${SITE_SUMMARY}

## Pages

- [Home](${url("/")}): what ${SITE_NAME} does and the statement analyzer
- [Pricing](${url("/pricing")}): plans, usage limits and FAQs
- [Sign up](${url("/signup")}): create a free account

## How it works

1. Sign in and upload a PDF bank statement (Pro and Business also accept password-protected PDFs).
2. ${SITE_NAME} reads every transaction and sorts it into 16 spending categories.
3. The report shows a balance chart, a spending breakdown and totals checked against the statement's own balances.
4. An AI assistant answers questions about that statement.

## Privacy

- Uploaded PDFs are read once and never stored.
- Reports are kept on the user's device by default.
- Users can opt in to cloud storage; cloud reports and chats are encrypted with AES-256-GCM before they are saved.

## Plans

${plans}

## FAQ

${faqs}

## Contact

${CONTACT_EMAIL}
`

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
