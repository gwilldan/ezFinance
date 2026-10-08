/** Name, copy and address shared by metadata, social images and llms.txt. */

export const SITE_NAME = "ezFinance"

export const SITE_TAGLINE = "Your money, finally making sense"

export const SITE_DESCRIPTION =
  "ezFinance AI turns bank statements, everyday spending and tax season into one calm, clear picture."

/** Longer description for search results, social cards and AI assistants. */
export const SITE_SUMMARY =
  "Upload a PDF bank statement and ezFinance AI categorizes every transaction, charts your balance, checks totals against the statement and answers questions about your spending. Reports stay on your device unless you choose encrypted cloud storage."

export const SITE_KEYWORDS = [
  "bank statement analyzer",
  "AI bank statement analysis",
  "PDF bank statement to report",
  "spending tracker",
  "personal finance",
  "transaction categorization",
  "expense tracker",
  "budgeting app",
]

/** Brand blue, matching --cyan-accent in app/globals.css. */
export const BRAND_COLOR = "#2477c9"

/**
 * The public address of the site. Set NEXT_PUBLIC_SITE_URL in production;
 * Vercel deployments fall back to their production domain.
 */
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
)
