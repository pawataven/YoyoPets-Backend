import { readWorkbook } from '../utils/order-import/read-workbook'

// Parsing a large xlsx blocks for seconds; off the main thread the page stays responsive (user decision 2026-11-18)
self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer, fileName: string }>) => {
  try {
    self.postMessage({ rows: readWorkbook(event.data.buffer, event.data.fileName) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) })
  }
}
