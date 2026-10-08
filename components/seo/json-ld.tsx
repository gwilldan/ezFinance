import { CONTACT_EMAIL, FAQS } from "@/lib/plans"
import { PRICING } from "@/lib/pricing"
import { SITE_DESCRIPTION, SITE_NAME, SITE_SUMMARY, SITE_URL } from "@/lib/site"

/** Structured data for search engines and AI assistants (schema.org). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escapes "<" so the data can't close the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

const url = (path = "/") => new URL(path, SITE_URL).href

const organization = {
  "@type": "Organization",
  "@id": url("/#organization"),
  name: SITE_NAME,
  url: url(),
  logo: url("/icon/512"),
  email: CONTACT_EMAIL,
}

/** The site, its publisher and the app itself, on every page. */
export const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organization,
    {
      "@type": "WebSite",
      "@id": url("/#website"),
      name: SITE_NAME,
      url: url(),
      description: SITE_DESCRIPTION,
      publisher: { "@id": organization["@id"] },
    },
    {
      "@type": "WebApplication",
      "@id": url("/#app"),
      name: SITE_NAME,
      url: url(),
      description: SITE_SUMMARY,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      publisher: { "@id": organization["@id"] },
      offers: {
        "@type": "Offer",
        price: 0,
        priceCurrency: PRICING.currency,
        description: "Free plan, no card required",
      },
    },
  ],
}

const offer = (name: string, price: number, description: string) => ({
  "@type": "Offer",
  name,
  price,
  priceCurrency: PRICING.currency,
  description,
  url: url("/pricing"),
})

/** Plans as offers, and the FAQ, for the pricing page. */
export const pricingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: `${SITE_NAME} Statement Analyzer`,
      description: SITE_SUMMARY,
      brand: { "@id": organization["@id"] },
      offers: [
        offer("Free", 0, "Free plan"),
        offer(
          "One-time report",
          PRICING.oneTimeReport.price,
          "One report, paid once"
        ),
        offer("Pro", PRICING.pro.monthly, "Billed monthly"),
        offer("Business", PRICING.business.monthly, "Billed monthly"),
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ],
}
