<script setup lang="ts">
import type { OrderReviewFilters } from '~/types/admin'

// Figma 20:1293
useSeoMeta({ title: 'ตรวจเลขออเดอร์ · YoyoPet Admin' })

const EXPORT_DEFAULT_DAYS = 30

const route = useRoute()
const toast = useToast()

// Tab, filters and page live in the URL so they survive reloads and can be shared
const filters = computed<OrderReviewFilters>({
  get: () => orderReviewFiltersFromQuery(route.query),
  set: next => navigateTo({ query: orderReviewQuery(next, 1) }, { replace: true })
})

const page = computed<number>({
  get: () => orderReviewPageFromQuery(route.query),
  set: next => navigateTo({ query: orderReviewQuery(filters.value, next) })
})

const selectedTab = computed({
  get: () => filters.value.tab,
  set: tab => (filters.value = { ...filters.value, tab })
})

const { orderPage, overview, isLoadingOrders, hasOrdersError, approveOrders, rejectOrders } = useOrderReview(filters, page)

const isSelectable = computed(() => filters.value.tab === 'pending_review')
const selectedIds = ref<string[]>([])

watch(() => route.fullPath, () => {
  selectedIds.value = []
})

// Selection is cleared on every page or filter change, so every selected order is on the current page
const selectedPoints = computed(() => (orderPage.value?.items ?? [])
  .filter(order => selectedIds.value.includes(order.id))
  .reduce((sum, order) => sum + (order.points ?? 0), 0))

// A filter change can leave the page past the end, e.g. after approving the last orders on page 3
watch(() => orderPage.value?.totalCount, (totalCount) => {
  if (totalCount === undefined) return
  const lastPage = Math.max(1, Math.ceil(totalCount / ORDER_REVIEW_PAGE_SIZE))
  if (page.value > lastPage) navigateTo({ query: orderReviewQuery(filters.value, lastPage) }, { replace: true })
})

const isBusy = ref(false)
const isRejectOpen = ref(false)

function skippedNote(skippedCount: number, reason: string) {
  return skippedCount ? `ข้าม ${skippedCount.toLocaleString('th-TH')} รายการ (${reason})` : undefined
}

async function approveSelected() {
  if (isBusy.value || !selectedIds.value.length) return
  isBusy.value = true
  try {
    const { updatedCount, skippedCount } = await approveOrders(selectedIds.value)
    selectedIds.value = []
    toast.add({
      title: `อนุมัติแล้ว ${updatedCount.toLocaleString('th-TH')} รายการ`,
      description: skippedNote(skippedCount, 'ได้แต้มไม่ได้หรือถูกตรวจไปแล้ว'),
      color: updatedCount ? 'success' : 'warning',
      icon: updatedCount ? 'i-lucide-check' : 'i-lucide-circle-alert'
    })
  } catch {
    toast.add({ title: 'อนุมัติไม่สำเร็จ กรุณาลองใหม่', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    isBusy.value = false
  }
}

async function rejectSelected(reason: string) {
  if (isBusy.value || !selectedIds.value.length) return
  isBusy.value = true
  try {
    const { updatedCount, skippedCount } = await rejectOrders(selectedIds.value, reason)
    selectedIds.value = []
    isRejectOpen.value = false
    toast.add({
      title: `ไม่อนุมัติ ${updatedCount.toLocaleString('th-TH')} รายการ`,
      description: skippedNote(skippedCount, 'ถูกตรวจไปแล้ว'),
      color: 'success',
      icon: 'i-lucide-check'
    })
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
      @approve="approveSelected"
      @reject="isRejectOpen = true"
    />

    <OrderRejectDialog
      v-model:open="isRejectOpen"
      :order-count="selectedIds.length"
      :is-busy="isBusy"
      @confirm="rejectSelected"
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
      class="mt-4"
    />
  </div>
</template>
