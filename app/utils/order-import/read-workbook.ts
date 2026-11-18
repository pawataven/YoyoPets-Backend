import * as XLSX from 'xlsx'

const UTF8_BOM = [0xEF, 0xBB, 0xBF]

function startsWithBytes(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((byte, index) => bytes[index] === byte)
}

// Thai CSVs saved by Excel or exported by Shopee are often Windows-874 (TIS-620), not UTF-8 (user's file, 2026-11-18)
export function decodeCsvBytes(bytes: Uint8Array) {
  const content = startsWithBytes(bytes, UTF8_BOM) ? bytes.subarray(UTF8_BOM.length) : bytes
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content)
  } catch {
    return new TextDecoder('windows-874').decode(content)
  }
}

// xlsx files are zip archives ("PK"), legacy xls files are OLE documents
function isSpreadsheetBinary(bytes: Uint8Array) {
  return startsWithBytes(bytes, [0x50, 0x4B]) || startsWithBytes(bytes, [0xD0, 0xCF, 0x11, 0xE0])
}

// Every cell comes back as text: numbers are never parsed, so long order numbers keep all their digits
export function readWorkbook(buffer: ArrayBuffer, fileName: string): string[][] {
  const bytes = new Uint8Array(buffer)
  const workbook = isSpreadsheetBinary(bytes) && !fileName.toLowerCase().endsWith('.csv')
    ? XLSX.read(bytes, { type: 'array', raw: false, cellDates: false })
    : XLSX.read(decodeCsvBytes(bytes), { type: 'string', raw: true })

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName]!, { header: 1, raw: false, defval: '' })
  return rows.map(row => row.map(cell => String(cell ?? '')))
}
