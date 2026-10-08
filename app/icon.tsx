import { BrandMark } from "@/lib/brand-mark"
import { ImageResponse } from "next/og"

const SIZES = [32, 192, 512]

/** The wallet mark as a favicon and as the install icons in app/manifest.ts. */
export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }))
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id)
  return new ImageResponse(<BrandMark size={size} />, {
    width: size,
    height: size,
  })
}
