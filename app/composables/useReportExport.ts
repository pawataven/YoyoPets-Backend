import { useRepositories } from '~/repositories'
import type { ReportRange } from '~/repositories/report.repository'
import type { ReportDefinition, ReportFileFormat } from '~/utils/report-types'

export function useReportExport() {
  const { report } = useRepositories()

  function reportFileName(definition: ReportDefinition, range: ReportRange, format: ReportFileFormat) {
    const lastDay = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate() - 1)
    const sampleSuffix = report.dataSource(definition.kind) === 'sample' ? '-ข้อมูลตัวอย่าง' : ''
    return `yoyopet-${definition.fileSlug}-${dateToKey(range.from)}_${dateToKey(lastDay)}${sampleSuffix}.${format}`
  }

  async function exportReport(definition: ReportDefinition, range: ReportRange, format: ReportFileFormat) {
    const table = await report.buildReport(definition.kind, range)
    await downloadReportFile(table, definition.sheetName, reportFileName(definition, range, format), format)
    return { rowCount: table.rows.length }
  }

  return {
    dataSource: report.dataSource,
    exportReport
  }
}
