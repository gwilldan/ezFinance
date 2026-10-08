import { SITE_URL } from "@/lib/site"
import type { MetadataRoute } from "next"

/** Public pages only; everything behind sign-in stays out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number) => ({
    url: new URL(path, SITE_URL).href,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority,
  })

  return [
    page("/", 1),
    page("/pricing", 0.8),
    page("/signup", 0.5),
    page("/login", 0.3),
  ]
}
