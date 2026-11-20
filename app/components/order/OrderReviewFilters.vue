<script setup lang="ts">
import type { MarketplacePlatform, OrderFileImport, OrderReviewFilters } from '~/types/admin'

const filters = defineModel<OrderReviewFilters>({ required: true })

defineProps<{
  latestImports: OrderFileImport[] | null
}>()

const SEARCH_DEBOUNCE_MS = 300

const searchInput = ref(filters.value.searchTerm)
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (term) => {
  clearTimeout(searchTimer)
  // Already in the URL (set by back/forward or the page itself): writing it back would rebuild the query and drop
  // page-level keys such as focus and review
  if (term === filters.value.searchTerm) return
  searchTimer = setTimeout(() => {
    filters.value = { ...filters.value, searchTerm: term }
  }, SEARCH_DEBOUNCE_MS)
})

// Back/forward navigation changes the URL without going through the input
watch(() => filters.value.searchTerm, (term) => {
  if (term !== searchInput.value) searchInput.value = term
})

onBeforeUnmount(() => clearTimeout(searchTimer))

// The tab's own date always has a button; the other one only while it is filtered, so no filter is ever out of sight
const leadDateColumn = computed(() => tabDateColumn(filters.value.tab))
const filteredOtherDateColumn = computed(() => {
  const column = otherOrderDateColumn(leadDateColumn.value)
  return isOrderDateRangeFiltered(filters.value, column) ? column : null
})

const IMPORT_PLATFORM_NAMES: Record<MarketplacePlatform, string> = { shopee: 'Shopee', lazada: 'Lazada', tiktok: 'TikTok' }

function importSummary(fileImport: OrderFileImport) {
  return `${IMPORT_PLATFORM_NAMES[fileImport.platform]} ${formatThaiDayMonthTime(fileImport.importedAt)}`
}
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
    <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap xl:items-center">
      <UInput
        v-model="searchInput"
        type="search"
        icon="i-lucide-search"
        placeholder="ค้นหาเลขคำสั่งซื้อ ชื่อ หรือรหัสสมาชิก"
        aria-label="ค้นหาเลขคำสั่งซื้อ ชื่อ หรือรหัสสมาชิก"
        class="sm:col-span-2 xl:w-90"
        :ui="{ base: 'h-11 rounded-xl bg-white ps-11 pe-10 text-[15px] ring-[1.5px] [&::-webkit-search-cancel-button]:hidden', leadingIcon: 'size-5 text-ink' }"
      >
        <template
          v-if="searchInput"
          #trailing
        >
          <UButton
            color="neutral"
            variant="link"
            icon="i-lucide-x"
            aria-label="ล้างคำค้นหา"
            class="text-muted hover:text-ink"
            @click="searchInput = ''"
          />
        </template>
      </UInput>

      <OrderDateRangeButton
        v-model="filters"
        :column="leadDateColumn"
      />

      <OrderDateRangeButton
        v-if="filteredOtherDateColumn"
        v-model="filters"
        :column="filteredOtherDateColumn"
      />

      <UButton
        v-if="hasActiveOrderFilters(filters)"
        color="neutral"
        variant="link"
        icon="i-lucide-x"
        class="justify-self-start text-[15px] font-bold text-primary-dark"
        @click="filters = clearOrderFilters(filters)"
      >
        ล้างตัวกรอง
      </UButton>
    </div>

    <div class="text-[13px] text-muted xl:ml-auto xl:text-right">
      <p class="font-bold">
        ข้อมูล Seller Center ล่าสุด
      </p>
      <p v-if="!latestImports">
        &nbsp;
      </p>
      <p v-else-if="!latestImports.length">
        ยังไม่เคยนำเข้า
      </p>
      <p v-else>
        {{ latestImports.map(importSummary).join(' · ') }}
      </p>
    </div>
  </div>
</template>
