import { PasswordException, PDFParse } from "pdf-parse"

// pdf.js PasswordResponses: 1 = a password is needed, 2 = it was wrong.
const INCORRECT_PASSWORD = 2

export class PdfPasswordError extends Error {
  constructor(readonly reason: "required" | "incorrect") {
    super(
      reason === "required"
        ? "This PDF is password-protected."
        : "That password didn't unlock the PDF."
    )
    this.name = "PdfPasswordError"
  }
}

/**
 * Reads each page's text. Throws PdfPasswordError when the file needs a
 * password or the given one is wrong. The password is only handed to pdf.js
 * for this read.
 */
export async function readPdfPages(
  data: Uint8Array,
  password?: string
): Promise<{ pages: string[]; total: number }> {
  const parser = new PDFParse({ data, password })
  try {
    const result = await parser.getText()
    return { pages: result.pages.map((page) => page.text), total: result.total }
  } catch (error) {
    if (error instanceof PasswordException) {
      const code = (error.cause as { code?: number } | undefined)?.code
      throw new PdfPasswordError(
        code === INCORRECT_PASSWORD ? "incorrect" : "required"
      )
    }
    throw error
  } finally {
    await parser.destroy()
  }
}
