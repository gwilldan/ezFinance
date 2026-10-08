import { BrandMark } from "@/lib/brand-mark"
import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/** Home-screen icon for iOS, which rounds the corners itself. */
export default function AppleIcon() {
  return new ImageResponse(<BrandMark size={size.width} rounded={false} />, {
    ...size,
  })
}
