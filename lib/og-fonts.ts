/**
 * Fetches just the glyphs `text` needs from Google Fonts, for `ImageResponse`.
 * Images render at build time; if the fetch fails they fall back to the
 * built-in font instead of failing the build.
 */
export async function loadGoogleFont(
  family: string,
  weight: 400 | 500 | 600 | 700,
  text: string
) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`
    ).then((response) => response.text())
    const url = css.match(
      /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/
    )?.[1]
    if (!url) return null
    const response = await fetch(url)
    return response.ok
      ? { name: family, data: await response.arrayBuffer(), weight }
      : null
  } catch {
    return null
  }
}
