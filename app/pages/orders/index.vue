<script setup lang="ts">
import type { OrderApproveOptions, OrderReviewFilters } from '~/types/admin'

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
  set: tab => (filters.value = { ...filters.value, tab })
})

const { orderPage, overview, isLoadingOrders, hasOrdersError, approveOrders, rejectOrders } = useOrderReview(filters, page)

const isSelectable = computed(() => filters.value.tab === 'pending_review')
const selectedIds = ref<string[]>([])

// Opening the drawer also changes the URL, so only a list change clears the selection
watch(() => JSON.stringify(orderReviewQuery(filters.value, page.value)), () => {
  selectedIds.value = []
})

// Selection is cleared on every page or filter change, so every selected order is on the current page
const selectedPoints = computed(() => (orderPage.value?.items ?? [])
  .filter(order => selectedIds.value.includes(order.id))
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

// After a decision the order usually leaves the list (e.g. the "รอตรวจ" tab), so open whatever took its place
function openNextAfterDecision(decidedId: string, previousIndex: number) {
  const items = orderPage.value?.items ?? []
  if (items.some(order => order.id === decidedId)) {
    refreshNuxtData(`order-review-detail-${decidedId}`)
    return
  }
  const replacement = items[previousIndex] ?? items[previousIndex - 1]
  reviewingId.value = replacement?.id ?? null
}

const isBusy = ref(false)
// Bulk bar rejects the selection; the drawer rejects the open order
const rejectTargetIds = ref<string[]>([])
const isRejectOpen = computed({
  get: () => rejectTargetIds.value.length > 0,
  set: (open) => {
    if (!open) rejectTargetIds.value = []
  }
})

function skippedNote(skippedCount: number, reason: string) {
  return skippedCount ? `ข้าม ${skippedCount.toLocaleString('th-TH')} รายการ (${reason})` : undefined
}

async function approve(orderIds: string[], options: OrderApproveOptions) {
  if (isBusy.value || !orderIds.length) return
  isBusy.value = true
  const decidedId = reviewingId.value
  const previousIndex = reviewingIndex.value
  try {
    const { updatedCount, skippedCount } = await approveOrders(orderIds, options)
    selectedIds.value = selectedIds.value.filter(id => !orderIds.includes(id))
    toast.add({
      title: `อนุมัติแล้ว ${updatedCount.toLocaleString('th-TH')} รายการ`,
      description: skippedNote(skippedCount, 'ได้แต้มไม่ได้หรือถูกตรวจไปแล้ว'),
      color: updatedCount ? 'success' : 'warning',
      icon: updatedCount ? 'i-lucide-check' : 'i-lucide-circle-alert'
    })
    if (decidedId && orderIds.includes(decidedId)) openNextAfterDecision(decidedId, previousIndex)
  } catch {
    toast.add({ title: 'อนุมัติไม่สำเร็จ กรุณาลองใหม่', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    isBusy.value = false
  }
}

async function reject(reason: string) {
  const orderIds = rejectTargetIds.value
  if (isBusy.value || !orderIds.length) return
  isBusy.value = true
  const decidedId = reviewingId.value
  const previousIndex = reviewingIndex.value
  try {
    const { updatedCount, skippedCount } = await rejectOrders(orderIds, reason)
    selectedIds.value = selectedIds.value.filter(id => !orderIds.includes(id))
    rejectTargetIds.value = []
    toast.add({
      title: `ไม่อนุมัติ ${updatedCount.toLocaleString('th-TH')} รายการ`,
      description: skippedNote(skippedCount, 'ถูกตรวจไปแล้ว'),
      color: 'success',
      icon: 'i-lucide-check'
    })
    if (decidedId && orderIds.includes(decidedId)) openNextAfterDecision(decidedId, previousIndex)
  } catch {
    toast.add({ title: 'บันทึกไม่สำเร็จ กรุณาลองใหม่', color: 'error', icon: 'i-lucide-circle-alert' })
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
      description="ตรวจเลขคำสั่งซื้อที่สมาชิกส่งมา เทียบกับไฟล์จาก Seller Center แล้วอนุมัติแต้ม"
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
      @approve="approve(selectedIds, { creditMode: 'after_return_window' })"
      @reject="rejectTargetIds = [...selectedIds]"
    />

    <OrderRejectDialog
      v-model:open="isRejectOpen"
      :order-count="rejectTargetIds.length"
      :is-busy="isBusy"
      @confirm="reject"
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
      :orders="orderPage?.items ?? null"
      :total-count="orderPage?.totalCount ?? 0"
      :is-selectable="isSelectable"
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
      @approve="approve(reviewingId ? [reviewingId] : [], $event)"
      @reject="rejectTargetIds = reviewingId ? [reviewingId] : []"
    />
  </div>
</template>
