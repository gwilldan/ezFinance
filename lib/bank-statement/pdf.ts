import { PDFParse } from "pdf-parse"

export async function readPdfPages(
  data: Uint8Array
): Promise<{ pages: string[]; total: number }> {
  const parser = new PDFParse({ data })
  try {
    const result = await parser.getText()
    return { pages: result.pages.map((page) => page.text), total: result.total }
  } finally {
    await parser.destroy()
  }
}
