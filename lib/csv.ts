/** Rows of cells. Handles quoted cells with commas and doubled quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character !== '"') cell += character
      else if (text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else quoted = false
    } else if (character === '"') quoted = true
    else if (character === ",") {
      row.push(cell)
      cell = ""
    } else if (character === "\n") {
      rows.push([...row, cell])
      row = []
      cell = ""
    } else if (character !== "\r") cell += character
  }
  if (cell || row.length) rows.push([...row, cell])
  return rows
}

/** One CSV line, quoting cells that need it. */
export function toCsvRow(cells: (string | number)[]): string {
  return cells
    .map((cell) => {
      const text = String(cell)
      return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
    })
    .join(",")
}
