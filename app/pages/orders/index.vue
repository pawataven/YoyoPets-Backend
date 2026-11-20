<script setup lang="ts">
import type { OrderApproveOptions, OrderDecisionLine, OrderReviewFilters, OrderReviewOutcome, OrderReviewStatus } from '~/types/admin'

// List: Figma 20:1293; review drawer: Figma 20:1642
useSeoMeta({ title: 'ตรวจเลขออเดอร์ · YoyoPet Admin' })

const EXPORT_DEFAULT_DAYS = 30

const route = useRoute()
const toast = useToast()

// Tab, filters, page and the order open in the drawer live in the URL so they survive reloads and can be shared
const filters = computed<OrderReviewFilters>({
  get: () => orderReviewFiltersFromQuery(route.query),
  set: next => navigateTo({ query: orderReviewQuery(next, 1) }, { replace: true })
})

const page = computed<number>({
  get: () => orderReviewPageFromQuery(route.query),
  set: next => navigateTo({ query: orderReviewQuery(filters.value, next) })
})

const reviewingId = computed<string | null>({
  get: () => (typeof route.query.review === 'string' ? route.query.review : null),
  set: (orderId) => {
    navigateTo({ query: { ...orderReviewQuery(filters.value, page.value), review: orderId ?? undefined } }, { replace: true })
  }
})

const selectedTab = computed({
  get: () => filters.value.tab,
  set: tab => (filters.value = withOrderReviewTab(filters.value, tab))
})

const {
  orderPage,
  overview,
  filterOptions,
  isLoadingOrders,
  hasOrdersError,
  approveOrders,
  rejectOrders,
  revokeApproval,
  countOrdersBefore
} = useOrderReview(filters, page)

const isSelectable = computed(() => filters.value.tab === 'pending_review')
const selectedIds = ref<string[]>([])

// Opening the drawer also changes the URL, so only a list change clears the selection
watch(() => JSON.stringify(orderReviewQuery(filters.value, page.value)), () => {
  selectedIds.value = []
})

// Selection is cleared on every page or filter change, so every selected order is on the current page.
// Only what a bulk approval would actually credit counts toward the total.
const selectedPoints = computed(() => (orderPage.value?.items ?? [])
  .filter(order => selectedIds.value.includes(order.id) && !bulkApprovalSkipReason(order))
  .reduce((sum, order) => sum + (order.points ?? 0), 0))

const lastPage = computed(() => Math.max(1, Math.ceil((orderPage.value?.totalCount ?? 0) / ORDER_REVIEW_PAGE_SIZE)))

// A filter change can leave the page past the end, e.g. after approving the last orders on page 3
watch(() => orderPage.value?.totalCount, (totalCount) => {
  if (totalCount === undefined) return
  if (page.value > lastPage.value) navigateTo({ query: orderReviewQuery(filters.value, lastPage.value) }, { replace: true })
})

const reviewingIndex = computed(() => orderPage.value?.items.findIndex(order => order.id === reviewingId.value) ?? -1)
const reviewingPosition = computed(() => (reviewingIndex.value < 0 ? null : (page.value - 1) * ORDER_REVIEW_PAGE_SIZE + reviewingIndex.value + 1))
const hasPreviousOrder = computed(() => reviewingIndex.value > 0 || (reviewingIndex.value === 0 && page.value > 1))
const hasNextOrder = computed(() => {
  const items = orderPage.value?.items ?? []
  return reviewingIndex.value >= 0 && (reviewingIndex.value < items.length - 1 || page.value < lastPage.value)
})

// Set when J/K crosses a page boundary: open the first or last order once the new page has loaded
const openOnPageLoad = ref<'first' | 'last' | null>(null)

watch(() => orderPage.value?.items, (items) => {
  if (!openOnPageLoad.value || !items?.length) return
  const target = openOnPageLoad.value === 'first' ? items[0]! : items[items.length - 1]!
  openOnPageLoad.value = null
  reviewingId.value = target.id
})

function goToAdjacentOrder(step: 1 | -1) {
  const items = orderPage.value?.items ?? []
  const neighbour = items[reviewingIndex.value + step]
  if (neighbour) {
    reviewingId.value = neighbour.id
    return
  }
  openOnPageLoad.value = step === 1 ? 'first' : 'last'
  navigateTo({ query: orderReviewQuery(filters.value, page.value + step) }, { replace: true })
}

// The admin asked for one decision per opening: auto-advancing made it too easy to approve the next order by mistake
function closeDrawerAfterDecision(orderIds: string[]) {
  if (reviewingId.value && orderIds.includes(reviewingId.value)) reviewingId.value = null
}

const isBusy = ref(false)

// Every decision goes through a confirmation that recaps the orders (user request 2026-11-17).
// The bulk bar decides the selection; the drawer decides the open order with the amount and points shown there.
const selectedOrders = computed(() => (orderPage.value?.items ?? []).filter(order => selectedIds.value.includes(order.id)))
const selectedLines = computed(() => selectedOrders.value.map(toOrderDecisionLine))
const selectedApprovalLines = computed(() => selectedOrders.value
  .map(order => ({ ...toOrderDecisionLine(order), skipReason: bulkApprovalSkipReason(order) })))

const pendingApproval = ref<{ lines: OrderDecisionLine[], options: OrderApproveOptions } | null>(null)
const isApproveConfirmOpen = computed({
  get: () => pendingApproval.value !== null,
  set: (open) => {
    if (!open) pendingApproval.value = null
  }
})

const rejectLines = ref<OrderDecisionLine[]>([])
const isRejectOpen = computed({
  get: () => rejectLines.value.length > 0,
  set: (open) => {
    if (!open) rejectLines.value = []
  }
})

const revokeLines = ref<OrderDecisionLine[]>([])
const isRevokeOpen = computed({
  get: () => revokeLines.value.length > 0,
  set: (open) => {
    if (!open) revokeLines.value = []
  }
})

function skippedNote(skippedCount: number, reason: string) {
  return skippedCount ? `ข้าม ${skippedCount.toLocaleString('th-TH')} รายการ (${reason})` : undefined
}

// Row flashed after "ไปดูรายการนี้" so the eye lands on it; the table times the flash once the row is on screen
const highlightedOrderId = ref<string | null>(null)
// If the row never loads (failed fetch, filters changed first), drop the id so it can't flash when the admin pages there later
const UNSHOWN_HIGHLIGHT_TIMEOUT_MS = 15000
let unshownHighlightTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(unshownHighlightTimer))

// Moves to the order's new tab and the page it sits on, keeping the admin's search and filters (they own them).
// If those filters hide it there, the tab still switches and the toast offers its details instead.
async function showOrderInList(outcome: OrderReviewOutcome) {
  const targetFilters = withOrderReviewTab(filters.value, outcome.status)
  let ordersBefore: number | null
  try {
    ordersBefore = await countOrdersBefore(targetFilters, outcome.id)
  } catch {
    ordersBefore = null
  }

  if (ordersBefore === null) {
    filters.value = targetFilters
    toast.add({
      title: `ตัวกรองที่ใช้อยู่ซ่อนรายการ ${outcome.orderNo}`,
      description: 'ลองล้างคำค้นหาหรือเปลี่ยนช่วงวันที่',
      color: 'warning',
      icon: 'i-lucide-filter',
      actions: [{ label: 'เปิดรายละเอียด', color: 'neutral', variant: 'outline', size: 'sm', onClick: () => { reviewingId.value = outcome.id } }]
    })
    return
  }

  clearTimeout(unshownHighlightTimer)
  highlightedOrderId.value = outcome.id
  unshownHighlightTimer = setTimeout(() => {
    if (highlightedOrderId.value === outcome.id) highlightedOrderId.value = null
  }, UNSHOWN_HIGHLIGHT_TIMEOUT_MS)
  navigateTo({ query: orderReviewQuery(targetFilters, Math.floor(ordersBefore / ORDER_REVIEW_PAGE_SIZE) + 1) })
}

// Decided orders leave the current tab, so the toast says where they went and links there
function decisionToast(title: string, outcomes: OrderReviewOutcome[], note: string | undefined) {
  const countByStatus = new Map<OrderReviewStatus, number>()
  for (const outcome of outcomes) countByStatus.set(outcome.status, (countByStatus.get(outcome.status) ?? 0) + 1)
  const destinations = [...countByStatus]

  const destinationText = outcomes.length === 1
    ? `ย้ายไปแท็บ "${ORDER_STATUS_BADGES[outcomes[0]!.status].label}"`
    : destinations.length
      ? `ย้ายไป ${destinations.map(([status, count]) => `${ORDER_STATUS_BADGES[status].label} ${count.toLocaleString('th-TH')}`).join(' · ')}`
      : undefined

  const actions = outcomes.length === 1
    ? [{ label: 'ไปดูรายการนี้', onClick: () => showOrderInList(outcomes[0]!) }]
    : destinations.map(([status]) => ({
        label: `ไปแท็บ ${ORDER_STATUS_BADGES[status].label}`,
        onClick: () => { selectedTab.value = status }
      }))

  toast.add({
    title,
    description: [destinationText, note].filter(Boolean).join(' · ') || undefined,
    color: outcomes.length ? 'success' : 'warning',
    icon: outcomes.length ? 'i-lucide-check' : 'i-lucide-circle-alert',
    duration: actions.length ? 8000 : undefined,
    actions: actions.map(action => ({ ...action, color: 'neutral' as const, variant: 'outline' as const, size: 'sm' as const }))
  })
}

async function confirmApproval() {
  const approval = pendingApproval.value
  if (isBusy.value || !approval) return
  // The database skips these too; leaving them out keeps the toast's skipped count to surprises only
  const orderIds = approval.lines.filter(line => !line.skipReason).map(line => line.id)
  if (!orderIds.length) return
  isBusy.value = true
  try {
    const { updatedCount, skippedCount, outcomes } = await approveOrders(orderIds, approval.options)
    selectedIds.value = selectedIds.value.filter(id => !orderIds.includes(id))
    pendingApproval.value = null
    decisionToast(
      `อนุมัติแล้ว ${updatedCount.toLocaleString('th-TH')} รายการ`,
      outcomes,
      skippedNote(skippedCount, 'ได้แต้มไม่ได้หรือถูกตรวจไปแล้ว')
    )
    closeDrawerAfterDecision(orderIds)
  } catch {
    toast.add({ title: 'อนุมัติไม่สำเร็จ กรุณาลองใหม่', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    isBusy.value = false
  }
}

async function reject(reason: string) {
  const orderIds = rejectLines.value.map(line => line.id)
  if (isBusy.value || !orderIds.length) return
  isBusy.value = true
  try {
    const { updatedCount, skippedCount, outcomes } = await rejectOrders(orderIds, reason)
    selectedIds.value = selectedIds.value.filter(id => !orderIds.includes(id))
    rejectLines.value = []
    decisionToast(
      `ไม่อนุมัติ ${updatedCount.toLocaleString('th-TH')} รายการ`,
      outcomes,
      skippedNote(skippedCount, 'ถูกตรวจไปแล้ว')
    )
    closeDrawerAfterDecision(orderIds)
  } catch {
    toast.add({ title: 'บันทึกไม่สำเร็จ กรุณาลองใหม่', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    isBusy.value = false
  }
}

const REVOKE_ERROR_MESSAGES: Record<string, string> = {
  points_already_usable: 'แต้มของรายการนี้พร้อมใช้แล้ว ยกเลิกการยืนยันไม่ได้',
  not_approved: 'รายการนี้ไม่ได้อยู่ในสถานะยืนยันแล้ว'
}

async function revoke(reason: string) {
  const line = revokeLines.value[0]
  if (isBusy.value || !line) return
  isBusy.value = true
  try {
    const outcomes = await revokeApproval(line.id, reason)
    revokeLines.value = []
    decisionToast('ยกเลิกการยืนยัน 1 รายการ', outcomes, undefined)
    closeDrawerAfterDecision([line.id])
  } catch (error) {
    const code = (error as { message?: string })?.message ?? ''
    toast.add({ title: REVOKE_ERROR_MESSAGES[code] ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    isBusy.value = false
  }
}

const isExportOpen = ref(false)
const exportUntil = new Date()
const exportFrom = new Date(exportUntil.getFullYear(), exportUntil.getMonth(), exportUntil.getDate() - (EXPORT_DEFAULT_DAYS - 1))
const exportTo = new Date(exportUntil.getFullYear(), exportUntil.getMonth(), exportUntil.getDate() + 1)
</script>

<template>
  <div>
    <AdminPageHeader
      :breadcrumbs="[{ label: 'หน้าแรก', to: '/' }, { label: 'ตรวจเลขออเดอร์' }]"
      title="ตรวจเลขออเดอร์"
      description="ตรวจเลขคำสั่งซื้อที่สมาชิกส่งมา เทียบกับข้อมูลจาก Seller Center แล้วอนุมัติแต้ม"
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          class="h-11 rounded-xl bg-white px-5 font-heading text-base font-normal text-ink ring-[1.5px]"
          @click="isExportOpen = true"
        >
          ส่งออก
        </UButton>
        <ReportExportDialog
          v-model:open="isExportOpen"
          :initial-from="exportFrom"
          :initial-to="exportTo"
          initial-kind="approved-orders"
        />

        <UButton
          to="/orders/import"
          icon="i-lucide-upload"
          class="h-11 rounded-xl px-5 font-heading text-base font-normal"
        >
          นำเข้าไฟล์จาก Seller Center
        </UButton>
      </template>
    </AdminPageHeader>

    <OrderReviewTabs
      v-model="selectedTab"
      :counts="overview?.statusCounts ?? null"
      class="mt-6 sm:mt-8"
    />

    <OrderReviewFilters
      v-model="filters"
      :latest-imports="overview?.latestImports ?? null"
      class="mt-5"
    />

    <OrderBulkBar
      v-if="isSelectable && selectedIds.length"
      :selected-count="selectedIds.length"
      :total-points="selectedPoints"
      :is-busy="isBusy"
      class="mt-4"
      @clear="selectedIds = []"
      @approve="pendingApproval = { lines: selectedApprovalLines, options: { creditMode: 'after_return_window' } }"
      @reject="rejectLines = selectedLines"
    />

    <UAlert
      v-if="hasOrdersError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="โหลดรายการคำสั่งซื้อไม่สำเร็จ กรุณารีเฟรชหน้า"
      class="mt-4"
    />

    <OrderReviewTable
      v-model:page="page"
      v-model:selected-ids="selectedIds"
      v-model:highlighted-id="highlightedOrderId"
      v-model:filters="filters"
      :orders="orderPage?.items ?? null"
      :total-count="orderPage?.totalCount ?? 0"
      :is-selectable="isSelectable"
      :shows-status="filters.tab === 'all'"
      :filter-options="filterOptions ?? null"
      :is-loading="isLoadingOrders"
      :reviewing-id="reviewingId"
      class="mt-4"
      @review="reviewingId = $event"
    />

    <OrderReviewDrawer
      v-model:order-id="reviewingId"
      :position="reviewingPosition"
      :total-count="orderPage?.totalCount ?? 0"
      :has-previous="hasPreviousOrder"
      :has-next="hasNextOrder"
      :is-busy="isBusy"
      @previous="goToAdjacentOrder(-1)"
      @next="goToAdjacentOrder(1)"
      @approve="(options, recap) => (pendingApproval = { lines: [recap], options })"
      @reject="recap => (rejectLines = [recap])"
      @revoke="recap => (revokeLines = [recap])"
    />

    <!-- Must come after the drawer: overlays have no z-index and stack in teleport order, so dialogs opened from the drawer would sit behind it -->
    <OrderApproveConfirmDialog
      v-model:open="isApproveConfirmOpen"
      :lines="pendingApproval?.lines ?? []"
      :credit-mode="pendingApproval?.options.creditMode ?? 'after_return_window'"
      :is-busy="isBusy"
      @confirm="confirmApproval"
    />

    <OrderRejectDialog
      v-model:open="isRejectOpen"
      :lines="rejectLines"
      :is-busy="isBusy"
      @confirm="reject"
    />

    <OrderRejectDialog
      v-model:open="isRevokeOpen"
      :lines="revokeLines"
      :is-busy="isBusy"
      mode="revoke"
      @confirm="revoke"
    />
  </div>
</template>