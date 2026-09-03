import { getUserByAccessToken } from "@/lib/supabase/server"
import { PDFParse } from "pdf-parse"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const user = await getUserByAccessToken()

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }

    const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) })

    try {
      const result = await parser.getText()
      const normalizedText = result.text

      return NextResponse.json({
        text: normalizedText,
        isLikelyScanned: normalizedText.length < 100,
        numPages: result.total,
      })
    } finally {
      await parser.destroy()
    }
  } catch (error) {
    console.error("PDF upload error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process PDF" },
      { status: 500 }
    )
  }
}
