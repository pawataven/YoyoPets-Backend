<script setup lang="ts">
import type { OrderReviewItem } from '~/types/admin'

const page = defineModel<number>('page', { required: true })
const selectedIds = defineModel<string[]>('selectedIds', { required: true })

const props = defineProps<{
  orders: OrderReviewItem[] | null
  totalCount: number
  // Only pending orders can be approved or rejected in bulk
  isSelectable: boolean
  isLoading: boolean
  // Order open in the review drawer, highlighted like the hovered row
  reviewingId: string | null
}>()

const emit = defineEmits<{
  review: [orderId: string]
}>()

const pageOrderIds = computed(() => props.orders?.map(order => order.id) ?? [])
const selectedOnPageCount = computed(() => pageOrderIds.value.filter(id => selectedIds.value.includes(id)).length)

const headerCheckboxState = computed(() => {
  if (!selectedOnPageCount.value) return false
  return selectedOnPageCount.value === pageOrderIds.value.length ? true : 'indeterminate'
})

function toggleAllOnPage() {
  selectedIds.value = headerCheckboxState.value === true
    ? selectedIds.value.filter(id => !pageOrderIds.value.includes(id))
    : [...new Set([...selectedIds.value, ...pageOrderIds.value])]
}

function toggleOrder(orderId: string, isSelected: boolean) {
  selectedIds.value = isSelected
    ? [...selectedIds.value, orderId]
    : selectedIds.value.filter(id => id !== orderId)
}

const rangeLabel = computed(() => {
  if (!props.totalCount) return 'ไม่มีรายการ'
  const first = (page.value - 1) * ORDER_REVIEW_PAGE_SIZE + 1
  const last = Math.min(page.value * ORDER_REVIEW_PAGE_SIZE, props.totalCount)
  return `แสดง ${first.toLocaleString('th-TH')}–${last.toLocaleString('th-TH')} จาก ${props.totalCount.toLocaleString('th-TH')} รายการ`
})

const CHECKBOX_UI = { base: 'size-5 rounded-[5px] ring-[1.5px] ring-accented' }
const PAGINATION_BUTTON = 'size-9 justify-center rounded-lg ring-[1.5px] font-number text-[15px] font-bold'
</script>

<template>
  <section class="overflow-hidden rounded-2xl border-[1.5px] border-default bg-white">
    <div class="relative overflow-x-auto">
      <table class="w-full min-w-295 text-left">
        <thead class="bg-cream text-sm font-bold text-muted">
          <tr class="h-13">
            <th
              v-if="isSelectable"
              scope="col"
              class="w-17 ps-6"
            >
              <UCheckbox
                :model-value="headerCheckboxState"
                :disabled="!pageOrderIds.length"
                aria-label="เลือกทุกรายการในหน้านี้"
                :ui="CHECKBOX_UI"
                @update:model-value="toggleAllOnPage"
              />
            </th>
            <th
              scope="col"
              :class="isSelectable ? 'w-37.5' : 'w-43.5 ps-6'"
            >
              ช่องทาง
            </th>
            <th
              scope="col"
              class="w-50"
            >
              เลขคำสั่งซื้อ
            </th>
            <th
              scope="col"
              class="w-62.5"
            >
              สมาชิก
            </th>
            <th
              scope="col"
              class="w-37.5"
            >
              ส่งเมื่อ
            </th>
            <th
              scope="col"
              class="w-22.5"
            >
              หลักฐาน
            </th>
            <th scope="col">
              ผลตรวจกับไฟล์ร้าน
            </th>
            <th
              scope="col"
              class="w-27.5 text-right"
            >
              ยอดซื้อ (บาท)
            </th>
            <th
              scope="col"
              class="w-25 text-right"
            >
              แต้ม
            </th>
            <th
              scope="col"
              class="w-54.5 pe-10"
            >
              <span class="sr-only">การทำงาน</span>
            </th>
          </tr>
        </thead>

        <tbody
          v-if="!orders"
          aria-busy="true"
        >
          <tr
            v-for="placeholder in ORDER_REVIEW_PAGE_SIZE"
            :key="placeholder"
            class="h-18 border-t border-default"
          >
            <td
              :colspan="isSelectable ? 10 : 9"
              class="px-6"
            >
              <USkeleton class="h-8 w-full" />
            </td>
          </tr>
        </tbody>

        <tbody v-else-if="!orders.length">
          <tr class="border-t border-default">
            <td
              :colspan="isSelectable ? 10 : 9"
              class="px-6 py-16 text-center text-muted"
            >
              ไม่พบคำสั่งซื้อตามเงื่อนไขที่เลือก
            </td>
          </tr>
        </tbody>

        <tbody
          v-else
          class="transition-opacity"
          :class="isLoading ? 'opacity-60' : undefined"
        >
          <tr
            v-for="order in orders"
            :key="order.id"
            class="group h-18 border-t border-default text-[15px] transition-colors"
            :class="selectedIds.includes(order.id) ? 'bg-cream' : 'hover:bg-cream/60'"
          >
            <td
              v-if="isSelectable"
              class="ps-6"
            >
              <UCheckbox
                :model-value="selectedIds.includes(order.id)"
                :aria-label="`เลือกคำสั่งซื้อ ${order.orderNo}`"
                :ui="CHECKBOX_UI"
                @update:model-value="toggleOrder(order.id, $event === true)"
              />
            </td>
            <td :class="isSelectable ? undefined : 'ps-6'">
              <span class="flex items-center gap-3 text-ink">
                <NuxtImg
                  :src="MARKETPLACE_LOGOS[order.platform].src"
                  alt=""
                  width="32"
                  height="32"
                  class="size-8 shrink-0"
                />
                {{ MARKETPLACE_LOGOS[order.platform].name }}
              </span>
            </td>
            <td class="font-number text-base text-ink">
              {{ order.orderNo }}
            </td>
            <td>
              <span class="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-[15px] text-primary-dark"
                >
                  {{ order.member.fullName.charAt(0) }}
                </span>
                <span class="min-w-0">
                  <span class="block truncate font-bold text-ink">{{ order.member.fullName }}</span>
                  <span class="block truncate font-number text-[13px] text-muted">
                    {{ order.member.memberCode }} · {{ order.member.tierName }}
                  </span>
                </span>
              </span>
            </td>
            <td class="text-muted">
              {{ formatThaiDayMonthTime(order.submittedAt) }}
            </td>
            <td>
              <span
                v-if="order.proofImageCount"
                class="flex items-center gap-2 text-sm font-bold text-primary-dark"
              >
                <UIcon
                  name="i-lucide-image"
                  class="size-5"
                />
                {{ order.proofImageCount }} รูป
              </span>
              <span
                v-else
                class="text-dimmed"
                aria-label="ไม่มีรูป"
              >–</span>
            </td>
            <td>
              <span
                class="inline-flex h-8 items-center rounded-full px-5 text-sm font-bold whitespace-nowrap"
                :class="ORDER_MATCH_BADGES[order.matchResult].class"
              >
                {{ orderMatchLabel(order) }}
              </span>
            </td>
            <td class="text-right font-bold text-ink">
              {{ order.amountBaht === null ? '–' : order.amountBaht.toLocaleString('th-TH') }}
            </td>
            <td class="text-right">
              <span
                v-if="order.points !== null"
                class="font-number text-[17px] font-bold text-success"
              >+{{ order.points.toLocaleString('th-TH') }}</span>
              <span
                v-else
                class="font-number text-[17px] font-bold text-dimmed"
                aria-label="ไม่ได้แต้ม"
              >–</span>
            </td>
            <td class="pe-10 text-right">
              <button
                type="button"
                class="inline-flex h-9 w-28 items-center justify-center rounded-lg font-heading text-[15px] transition-colors group-hover:bg-primary group-hover:text-white focus-visible:bg-primary focus-visible:text-white"
                :class="order.id === reviewingId ? 'bg-primary text-white' : 'bg-primary-soft text-primary-dark'"
                :aria-label="`ตรวจสอบคำสั่งซื้อ ${order.orderNo}`"
                @click="emit('review', order.id)"
              >
                ตรวจสอบ
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-6 py-4">
      <p class="text-sm text-muted">
        {{ rangeLabel }}
      </p>
      <UPagination
        v-if="totalCount > ORDER_REVIEW_PAGE_SIZE"
        v-model:page="page"
        :total="totalCount"
        :items-per-page="ORDER_REVIEW_PAGE_SIZE"
        :sibling-count="1"
        color="neutral"
        variant="outline"
        active-color="primary"
        active-variant="solid"
        prev-icon="i-lucide-chevron-left"
        next-icon="i-lucide-chevron-right"
        :ui="{
          list: 'gap-1',
          first: 'hidden',
          last: 'hidden',
          prev: PAGINATION_BUTTON,
          next: PAGINATION_BUTTON,
          item: PAGINATION_BUTTON,
          ellipsis: 'size-9 justify-center'
        }"
      />
    </div>
  </section>
</template>
