import { SITE_URL } from "@/lib/site"
import type { MetadataRoute } from "next"

/** Account pages, reports and the API are private to each user. */
const PRIVATE = ["/api/", "/result/", "/settings"]

/** AI crawlers named explicitly, so their access is a visible decision. */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: new URL("/sitemap.xml", SITE_URL).href,
    host: SITE_URL.origin,
  }
}
