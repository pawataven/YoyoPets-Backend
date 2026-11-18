import type { ColumnAlias, ColumnByField, HeaderDetection, ImportField } from '~/types/order-import'
import { normalizeHeader } from './normalize'

// Without these three an order cannot be matched, valued or given a status
export const REQUIRED_IMPORT_FIELDS: ImportField[] = ['order_no', 'status', 'amount']

const HEADER_SCAN_ROWS = 20

// Some exports put a title block above the header, so the row with the most known column names wins
export function detectHeader(rows: string[][], aliases: ColumnAlias[]): HeaderDetection {
  const fieldByAlias = new Map(aliases.map(alias => [alias.alias, alias.field]))

  let headerRowIndex = -1
  let bestMatchCount = 0
  rows.slice(0, HEADER_SCAN_ROWS).forEach((row, rowIndex) => {
    const matchCount = row.filter(cell => fieldByAlias.has(normalizeHeader(cell))).length
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount
      headerRowIndex = rowIndex
    }
  })

  const columnByField: ColumnByField = {}
  if (headerRowIndex >= 0) {
    rows[headerRowIndex]!.forEach((cell, columnIndex) => {
      const field = fieldByAlias.get(normalizeHeader(cell))
      if (field && columnByField[field] === undefined) columnByField[field] = columnIndex
    })
  }

  return {
    headerRowIndex,
    columnByField,
    missingFields: REQUIRED_IMPORT_FIELDS.filter(field => columnByField[field] === undefined)
  }
}
