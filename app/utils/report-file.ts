import type { ReportFileFormat, ReportTable } from '~/utils/report-types'

// Rows keyed by the Thai column labels, in column order, so the header row reads naturally in Excel
function toLabelledRows(table: ReportTable) {
  return table.rows.map(row => Object.fromEntries(table.columns.map(column => [column.label, row[column.key] ?? ''])))
}

const UTF8_BYTE_ORDER_MARK = String.fromCharCode(0xfeff)

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function downloadReportFile(table: ReportTable, sheetName: string, fileName: string, format: ReportFileFormat) {
  // SheetJS is large; load it only when someone actually exports
  const XLSX = await import('xlsx')
  const sheet = XLSX.utils.json_to_sheet(toLabelledRows(table), { header: table.columns.map(column => column.label) })

  if (format === 'csv') {
    // Excel opens UTF-8 CSV as mojibake Thai unless the file starts with a byte-order mark
    const csv = `${UTF8_BYTE_ORDER_MARK}${XLSX.utils.sheet_to_csv(sheet)}`
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName)
    return
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  triggerDownload(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
}
