<script setup lang="ts">
import type { MarketplacePlatform } from '~/types/admin'
import type { ImportHistoryEntry } from '~/types/order-import'

const platformFilter = defineModel<MarketplacePlatform | 'all'>('platformFilter', { required: true })

defineProps<{
  // null while loading
  entries: ImportHistoryEntry[] | null
  hasError: boolean
}>()

const PLATFORM_FILTER_ITEMS = [
  { label: 'ทุกช่องทาง', value: 'all' },
  ...IMPORT_PLATFORM_OPTIONS.map(option => ({ label: option.label, value: option.value }))
]

function orderedRange(entry: ImportHistoryEntry) {
  if (!entry.orderedFrom || !entry.orderedTo) return '–'
  return formatThaiDateRange(new Date(entry.orderedFrom), new Date(entry.orderedTo))
}

function pointChanges(entry: ImportHistoryEntry) {
  const parts = [
    entry.pointsReleased && `เข้า ${entry.pointsReleased.toLocaleString('th-TH')}`,
    entry.pointsScheduled && `ตั้งวันเข้า ${entry.pointsScheduled.toLocaleString('th-TH')}`,
    entry.pointsReduced && `ลด ${entry.pointsReduced.toLocaleString('th-TH')}`,
    entry.pointsCancelled && `ยกเลิก ${entry.pointsCancelled.toLocaleString('th-TH')}`
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'ไม่มี'
}
</script>

<template>
  <section class="rounded-2xl border-[1.5px] border-default bg-white">
    <div class="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
      <div>
        <h2 class="text-lg font-bold text-ink">
          ประวัติการนำเข้า
        </h2>
        <p class="mt-1 text-sm text-muted">
          20 ครั้งล่าสุด ใช้ดูว่าวันนี้นำเข้าแล้วหรือยัง และไฟล์ล่าสุดครอบคลุมออเดอร์ถึงวันไหน
        </p>
      </div>
      <USelect
        v-model="platformFilter"
        :items="PLATFORM_FILTER_ITEMS"
        aria-label="กรองตามช่องทาง"
        class="w-44"
        :ui="{ base: 'h-10 rounded-xl ring-[1.5px]' }"
      />
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-240 text-left text-[15px]">
        <thead class="bg-cream text-sm font-bold text-muted">
          <tr class="h-11">
            <th
              scope="col"
              class="ps-6"
            >
              ช่องทาง
            </th>
            <th scope="col">
              ไฟล์
            </th>
            <th scope="col">
              นำเข้าโดย
            </th>
            <th scope="col">
              เมื่อ
            </th>
            <th
              scope="col"
              class="text-right"
            >
              ออเดอร์
            </th>
            <th
              scope="col"
              class="ps-6"
            >
              ช่วงวันสั่งซื้อ
            </th>
            <th
              scope="col"
              class="pe-6"
            >
              แต้มที่เปลี่ยน
            </th>
          </tr>
        </thead>

        <tbody v-if="!entries && !hasError">
          <tr
            v-for="placeholder in 3"
            :key="placeholder"
            class="h-14 border-t border-default"
          >
            <td
              colspan="7"
              class="px-6"
            >
              <USkeleton class="h-6 w-full" />
            </td>
          </tr>
        </tbody>

        <tbody v-else-if="hasError || !entries?.length">
          <tr class="border-t border-default">
            <td
              colspan="7"
              class="px-6 py-10 text-center text-muted"
            >
              {{ hasError ? 'โหลดประวัติการนำเข้าไม่สำเร็จ ลองรีเฟรชหน้า' : 'ยังไม่เคยนำเข้าไฟล์' }}
            </td>
          </tr>
        </tbody>

        <tbody v-else>
          <tr
            v-for="entry in entries"
            :key="entry.id"
            class="h-14 border-t border-default"
            :class="entry.isInProgress ? 'bg-gold-soft/60' : undefined"
          >
            <td class="ps-6">
              <span class="flex items-center gap-2 text-ink">
                <NuxtImg
                  :src="MARKETPLACE_LOGOS[entry.platform].src"
                  alt=""
                  width="24"
                  height="24"
                  class="size-6 shrink-0"
                />
                {{ MARKETPLACE_LOGOS[entry.platform].name }}
              </span>
            </td>
            <td class="max-w-72">
              <span
                class="block truncate text-ink"
                :title="entry.fileName"
              >{{ entry.fileName }}</span>
            </td>
            <td class="text-muted">
              {{ entry.importerName ?? REMOVED_ADMIN_NAME }}
            </td>
            <td class="whitespace-nowrap text-muted">
              {{ formatThaiDayMonthTime(entry.importedAt) }}
            </td>
            <template v-if="entry.isInProgress">
              <td
                colspan="3"
                class="ps-6 pe-6 text-sm font-bold text-pending"
              >
                <span class="inline-flex items-center gap-1.5">
                  <UIcon
                    name="i-lucide-triangle-alert"
                    class="size-4"
                  />
                  นำเข้าค้างไว้ไม่เสร็จ · เลือกไฟล์เดิมอีกครั้งเพื่อทำต่อจากที่ค้าง
                </span>
              </td>
            </template>
            <template v-else>
              <td class="text-right font-number font-bold text-ink">
                {{ entry.ordersTotal === null ? '–' : entry.ordersTotal.toLocaleString('th-TH') }}
              </td>
              <td class="ps-6 whitespace-nowrap text-muted">
                {{ orderedRange(entry) }}
              </td>
              <td class="pe-6 text-sm text-muted">
                {{ pointChanges(entry) }}
                <span
                  v-if="entry.warningCount"
                  class="mt-0.5 block font-bold text-primary-dark"
                >
                  ⚠ เตือน {{ entry.warningCount.toLocaleString('th-TH') }} ออเดอร์ (แต้มใช้ได้แล้วแต่คืนสินค้า)
                </span>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
