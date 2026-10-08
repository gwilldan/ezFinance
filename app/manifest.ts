import { BRAND_COLOR, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site"
import type { MetadataRoute } from "next"

/** Lets the site install to a home screen with the wallet mark. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f9f8f5",
    theme_color: BRAND_COLOR,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  }
}
