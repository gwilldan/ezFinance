import { BRAND_COLOR } from "@/lib/site"

/**
 * The ezFinance wallet mark (see components/ui/icon.tsx) as plain JSX for
 * `ImageResponse`: a white lucide Wallet on the brand blue.
 */
export function BrandMark({
  size,
  rounded = true,
}: {
  size: number
  /** iOS masks its own corners, so the Apple icon stays square. */
  rounded?: boolean
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_COLOR,
        borderRadius: rounded ? size * 0.25 : 0,
      }}
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </svg>
    </div>
  )
}
