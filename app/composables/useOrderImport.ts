import { useRepositories } from '~/repositories'
import type { MarketplacePlatform } from '~/types/admin'
import type {
  ColumnByField,
  FileOrderStatus,
  GroupedOrders,
  HeaderDetection,
  ImportField,
  ImportHistoryEntry,
  ImportSummary
} from '~/types/order-import'
import { detectHeader } from '~/utils/order-import/detect-header'
import { sha256Hex } from '~/utils/order-import/file-hash'
import { groupOrders } from '~/utils/order-import/group-orders'
import { normalizeHeader, normalizeRawStatus } from '~/utils/order-import/normalize'

export type OrderImportStep = 'choose' | 'reading' | 'map_columns' | 'map_statuses' | 'review' | 'importing' | 'done'

// import_order_chunk accepts up to 2,000; 1,000 keeps each request well under Supabase's statement timeout
const IMPORT_CHUNK_SIZE = 1000
const LONG_WAIT_DAYS = 14
const IMPORT_HISTORY_LIMIT = 20

const IMPORT_ERROR_MESSAGES: Record<string, string> = {
  duplicate_file: 'ไฟล์นี้เคยนำเข้าเสร็จแล้ว ถ้าต้องการอัปเดตสถานะ ให้ export ไฟล์ใหม่จาก Seller Center',
  not_admin: 'บัญชีนี้ไม่มีสิทธิ์นำเข้าไฟล์ หรือยังไม่ได้ยืนยันตัวตน 2 ขั้นตอน',
  invalid_order_row: 'ข้อมูลบางแถวในไฟล์ไม่ถูกต้อง',
  duplicate_order_in_file: 'ไฟล์มีเลขคำสั่งซื้อซ้ำกัน',
  invalid_platform: 'ไฟล์นี้เคยเริ่มนำเข้าในช่องทางอื่น'
}

function importErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : (error as { message?: string })?.message
  return (code && IMPORT_ERROR_MESSAGES[code])
    ?? 'นำเข้าไม่สำเร็จ ส่วนที่นำเข้าไปแล้วไม่หาย เลือกไฟล์เดิมอีกครั้งเพื่อทำต่อจากที่ค้าง'
}

function readFileInWorker(buffer: ArrayBuffer, fileName: string) {
  return new Promise<string[][]>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/read-order-file.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<{ rows?: string[][], error?: string }>) => {
      worker.terminate()
      if (event.data.rows) resolve(event.data.rows)
      else reject(new Error(event.data.error ?? 'read_failed'))
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message))
    }
    worker.postMessage({ buffer, fileName }, [buffer])
  })
}

function firstNonEmptyRowIndex(rows: string[][]) {
  return rows.findIndex(row => row.some(cell => cell.trim()))
}

export function useOrderImport() {
  const { orderImport } = useRepositories()

  const platform = ref<MarketplacePlatform>('lazada')
  const step = ref<OrderImportStep>('choose')
  const errorMessage = ref<string | null>(null)
  const fileName = ref('')
  const rows = shallowRef<string[][]>([])
  const detection = shallowRef<HeaderDetection | null>(null)
  const grouped = shallowRef<GroupedOrders | null>(null)
  const progress = ref({ sent: 0, total: 0 })
  const summary = ref<ImportSummary | null>(null)
  const longWaitingCount = ref<number | null>(null)
  const historyPlatform = ref<MarketplacePlatform | 'all'>('all')
  const history = ref<ImportHistoryEntry[] | null>(null)
  const hasHistoryError = ref(false)
  let fileHash = ''

  async function refreshHistory() {
    try {
      history.value = await orderImport.listImportHistory(
        IMPORT_HISTORY_LIMIT,
        historyPlatform.value === 'all' ? null : historyPlatform.value
      )
      hasHistoryError.value = false
    } catch {
      hasHistoryError.value = true
    }
  }

  watch(historyPlatform, refreshHistory)

  const headerRow = computed(() => (detection.value ? rows.value[detection.value.headerRowIndex] ?? [] : []))
  const dataRows = computed(() => (detection.value ? rows.value.slice(detection.value.headerRowIndex + 1) : []))

  async function refreshLongWaitingCount() {
    longWaitingCount.value = await orderImport.countLongWaitingCredits(LONG_WAIT_DAYS).catch(() => null)
  }

  function reset() {
    step.value = 'choose'
    errorMessage.value = null
    fileName.value = ''
    rows.value = []
    detection.value = null
    grouped.value = null
    summary.value = null
    progress.value = { sent: 0, total: 0 }
    fileHash = ''
  }

  function fail(message: string) {
    errorMessage.value = message
    step.value = 'choose'
  }

  async function groupWithKnownStatuses() {
    const statusByRaw = await orderImport.listStatusAliases(platform.value)
    const { headerRowIndex, columnByField } = detection.value!
    grouped.value = groupOrders(dataRows.value, columnByField, statusByRaw, headerRowIndex)
    step.value = grouped.value.unknownStatuses.length ? 'map_statuses' : 'review'
  }

  async function selectFile(file: File) {
    errorMessage.value = null
    summary.value = null
    step.value = 'reading'
    fileName.value = file.name
    try {
      const buffer = await file.arrayBuffer()
      fileHash = await sha256Hex(buffer)
      rows.value = await readFileInWorker(buffer.slice(0), file.name)
      if (firstNonEmptyRowIndex(rows.value) < 0) return fail('ไฟล์ว่าง ไม่มีข้อมูลให้นำเข้า')

      const found = detectHeader(rows.value, await orderImport.listColumnAliases(platform.value))
      // Nothing recognised: offer the first filled row as the header so the admin can map it
      detection.value = found.headerRowIndex >= 0 ? found : { ...found, headerRowIndex: firstNonEmptyRowIndex(rows.value) }

      if (found.missingFields.length || found.columnByField.delivered_at === undefined) {
        step.value = 'map_columns'
        return
      }
      await groupWithKnownStatuses()
    } catch (error) {
      fail(error instanceof Error && error.message !== 'read_failed'
        ? `อ่านไฟล์ไม่ได้ (${error.message}) ตรวจว่าเป็นไฟล์ .csv หรือ .xlsx จาก Seller Center`
        : 'อ่านไฟล์ไม่ได้ ตรวจว่าเป็นไฟล์ .csv หรือ .xlsx จาก Seller Center')
    }
  }

  // columnIndexByField: the admin's choice per field; null = "this file has no such column"
  async function confirmColumns(columnIndexByField: Partial<Record<ImportField, number | null>>) {
    const columnByField: ColumnByField = { ...detection.value!.columnByField }
    const newAliases = []
    for (const [field, columnIndex] of Object.entries(columnIndexByField) as [ImportField, number | null][]) {
      if (columnIndex === null) continue
      columnByField[field] = columnIndex
      const alias = normalizeHeader(headerRow.value[columnIndex] ?? '')
      if (alias) newAliases.push({ field, alias })
    }
    try {
      await orderImport.addColumnAliases(platform.value, newAliases)
      detection.value = { ...detection.value!, columnByField, missingFields: [] }
      await groupWithKnownStatuses()
    } catch (error) {
      errorMessage.value = importErrorMessage(error)
    }
  }

  async function confirmStatuses(statusByRawStatus: Record<string, FileOrderStatus>) {
    try {
      await orderImport.saveStatusAliases(platform.value, Object.entries(statusByRawStatus)
        .map(([rawStatus, status]) => ({ rawStatus: normalizeRawStatus(rawStatus), status })))
      await groupWithKnownStatuses()
    } catch (error) {
      errorMessage.value = importErrorMessage(error)
    }
  }

  async function sendChunk(importId: string, chunk: GroupedOrders['orders']) {
    try {
      await orderImport.importChunk(importId, chunk)
    } catch {
      // One retry for a dropped connection; chunks are idempotent so a repeat is harmless
      await orderImport.importChunk(importId, chunk)
    }
  }

  async function runImport() {
    const orders = grouped.value?.orders ?? []
    if (!orders.length) return
    errorMessage.value = null
    step.value = 'importing'
    progress.value = { sent: 0, total: orders.length }
    try {
      const importId = await orderImport.startImport(platform.value, fileName.value, fileHash)
      for (let start = 0; start < orders.length; start += IMPORT_CHUNK_SIZE) {
        const chunk = orders.slice(start, start + IMPORT_CHUNK_SIZE)
        await sendChunk(importId, chunk)
        progress.value = { sent: start + chunk.length, total: orders.length }
      }
      summary.value = await orderImport.finishImport(importId)
      step.value = 'done'
      await Promise.all([
        refreshLongWaitingCount(),
        refreshHistory(),
        refreshNuxtData(['order-review-overview', 'work-queue-counts'])
      ])
    } catch (error) {
      errorMessage.value = importErrorMessage(error)
      step.value = 'review'
      await refreshHistory()
    }
  }

  watch(platform, reset)

  return {
    platform,
    step,
    errorMessage,
    fileName,
    headerRow,
    dataRows,
    detection,
    grouped,
    progress,
    summary,
    longWaitingCount,
    longWaitDays: LONG_WAIT_DAYS,
    historyPlatform,
    history,
    hasHistoryError,
    refreshHistory,
    selectFile,
    confirmColumns,
    confirmStatuses,
    runImport,
    reset,
    refreshLongWaitingCount
  }
}
