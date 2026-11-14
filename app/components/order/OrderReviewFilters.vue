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
  searchTimer = setTimeout(() => {
    filters.value = { ...filters.value, searchTerm: term }
  }, SEARCH_DEBOUNCE_MS)
})

// Back/forward navigation changes the URL without going through the input
watch(() => filters.value.searchTerm, (term) => {
  if (term !== searchInput.value) searchInput.value = term
})

onBeforeUnmount(() => clearTimeout(searchTimer))

function updateFilter<K extends keyof OrderReviewFilters>(key: K, value: OrderReviewFilters[K]) {
  filters.value = { ...filters.value, [key]: value }
}

const IMPORT_PLATFORM_NAMES: Record<MarketplacePlatform, string> = { shopee: 'Shopee', lazada: 'Lazada', tiktok: 'TikTok' }

function importSummary(fileImport: OrderFileImport) {
  return `${IMPORT_PLATFORM_NAMES[fileImport.platform]} ${formatThaiDayMonthTime(fileImport.importedAt)}`
}

const SELECT_UI = {
  base: 'h-11 rounded-xl bg-white ps-3.5 text-[15px] text-ink ring-[1.5px]',
  trailingIcon: 'size-5 text-ink'
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
        :ui="{ base: 'h-11 rounded-xl bg-white ps-11 text-[15px] ring-[1.5px]', leadingIcon: 'size-5 text-ink' }"
      />

      <USelect
        :model-value="filters.platform"
        :items="ORDER_PLATFORM_OPTIONS"
        aria-label="ช่องทาง"
        class="xl:w-50"
        :ui="SELECT_UI"
        @update:model-value="updateFilter('platform', $event)"
      >
        <template #default="{ modelValue }">
          ช่องทาง: {{ ORDER_PLATFORM_OPTIONS.find(option => option.value === modelValue)?.label }}
        </template>
      </USelect>

      <USelect
        :model-value="filters.matchResult"
        :items="ORDER_MATCH_OPTIONS"
        aria-label="ผลตรวจกับไฟล์ร้าน"
        class="xl:w-60"
        :ui="SELECT_UI"
        @update:model-value="updateFilter('matchResult', $event)"
      >
        <template #default="{ modelValue }">
          ผลตรวจ: {{ ORDER_MATCH_OPTIONS.find(option => option.value === modelValue)?.label }}
        </template>
      </USelect>

      <USelect
        :model-value="filters.submittedWithin"
        :items="ORDER_SUBMITTED_WITHIN_OPTIONS"
        icon="i-lucide-calendar"
        aria-label="ส่งเมื่อ"
        class="xl:w-55"
        :ui="{ ...SELECT_UI, base: `${SELECT_UI.base} ps-11`, leadingIcon: 'size-5 text-ink' }"
        @update:model-value="updateFilter('submittedWithin', $event)"
      >
        <template #default="{ modelValue }">
          ส่งเมื่อ: {{ ORDER_SUBMITTED_WITHIN_OPTIONS.find(option => option.value === modelValue)?.label }}
        </template>
      </USelect>
    </div>

    <div class="text-[13px] text-muted xl:ml-auto xl:text-right">
      <p class="font-bold">
        ไฟล์ล่าสุด
      </p>
      <p v-if="!latestImports">
        &nbsp;
      </p>
      <p v-else-if="!latestImports.length">
        ยังไม่เคยนำเข้าไฟล์
      </p>
      <p v-else>
        {{ latestImports.map(importSummary).join(' · ') }}
      </p>
    </div>
  </div>
</template>
