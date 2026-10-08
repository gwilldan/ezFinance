import { BrandMark } from "@/lib/brand-mark"
import { loadGoogleFont } from "@/lib/og-fonts"
import { BRAND_COLOR, SITE_NAME } from "@/lib/site"
import { ImageResponse } from "next/og"

/** Size every social card is drawn at (Open Graph and X). */
export const OG_SIZE = { width: 1200, height: 630 }

/**
 * A branded social card: the wallet mark, a two-line serif headline (the
 * second line in brand blue), a short description and a row of pills.
 */
export async function renderOgCard({
  headline,
  description,
  points,
}: {
  headline: [string, string]
  description: string
  points: string[]
}) {
  const sansText = [SITE_NAME, description, ...points].join("")
  const fonts = (
    await Promise.all([
      loadGoogleFont("Instrument Serif", 400, headline.join("")),
      loadGoogleFont("Inter", 400, sansText),
      loadGoogleFont("Inter", 600, sansText),
    ])
  ).filter((font) => font !== null)

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#f5f4f0",
        color: "#1d1e22",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <BrandMark size={56} />
        <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>
          {SITE_NAME}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Instrument Serif",
            fontSize: 104,
            lineHeight: 1.02,
            letterSpacing: -1.5,
          }}
        >
          <span>{headline[0]}</span>
          <span style={{ color: BRAND_COLOR }}>{headline[1]}</span>
        </div>
        <p
          style={{
            marginTop: 28,
            maxWidth: 860,
            fontSize: 30,
            lineHeight: 1.45,
            color: "#6b6e78",
          }}
        >
          {description}
        </p>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        {points.map((point) => (
          <span
            key={point}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              borderRadius: 999,
              border: "1px solid #dcdde2",
              background: "white",
              fontSize: 22,
              color: "#3a3c44",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: BRAND_COLOR,
              }}
            />
            {point}
          </span>
        ))}
      </div>
    </div>,
    { ...OG_SIZE, fonts }
  )
}
