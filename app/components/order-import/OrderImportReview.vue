<script setup lang="ts">
import type { FileOrderStatus, GroupedOrders } from '~/types/order-import'

const props = defineProps<{
  grouped: GroupedOrders
  fileName: string
  isImporting: boolean
  progress: { sent: number, total: number }
}>()

const emit = defineEmits<{
  import: []
  cancel: []
}>()

const SAMPLE_COUNT = 3

const sampleOrders = computed(() => props.grouped.orders.slice(0, SAMPLE_COUNT))
const totalAmount = computed(() => props.grouped.orders.reduce((sum, order) => sum + order.amount_baht, 0))

const countByStatus = computed(() => {
  const counts = new Map<FileOrderStatus, number>()
  for (const order of props.grouped.orders) counts.set(order.status, (counts.get(order.status) ?? 0) + 1)
  return FILE_STATUS_OPTIONS.filter(option => counts.has(option.value)).map(option => ({ ...option, count: counts.get(option.value)! }))
})

// Tells the admin how far back the export reaches (spec: export daily, overlap is fine)
const orderedRange = computed(() => {
  const times = props.grouped.orders.map(order => order.ordered_at).filter((value): value is string => value !== null).map(Date.parse)
  if (!times.length) return null
  return formatThaiDateRange(new Date(Math.min(...times)), new Date(Math.max(...times)))
})

const progressPercent = computed(() => (props.progress.total ? Math.round(props.progress.sent / props.progress.total * 100) : 0))

function formatBaht(value: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
</script>

<template>
  <section class="rounded-2xl border-[1.5px] border-default bg-white p-6">
    <h2 class="text-lg font-bold text-ink">
      ตรวจก่อนนำเข้า
    </h2>
    <p class="mt-1 text-sm text-muted">
      {{ fileName }} · {{ grouped.orders.length.toLocaleString('th-TH') }} ออเดอร์
      <template v-if="orderedRange">
        · สั่งซื้อระหว่าง {{ orderedRange }}
      </template>
    </p>

    <ul class="mt-4 flex flex-wrap gap-2">
      <li
        v-for="status in countByStatus"
        :key="status.value"
        class="rounded-full bg-cream px-3 py-1 text-sm text-ink"
      >
        {{ status.label }} <span class="font-number font-bold">{{ status.count.toLocaleString('th-TH') }}</span>
      </li>
      <li class="rounded-full bg-cream px-3 py-1 text-sm text-ink">
        ยอดคิดแต้มรวม <span class="font-number font-bold">{{ formatBaht(totalAmount) }}</span> บาท
      </li>
    </ul>

    <h3 class="mt-6 text-[15px] font-bold text-ink">
      {{ sampleOrders.length }} ออเดอร์แรก: เทียบกับหน้าคำสั่งซื้อใน Seller Center ว่าตรงกันไหม
    </h3>
    <div class="mt-3 overflow-x-auto rounded-xl border border-default">
      <table class="w-full min-w-160 text-left text-[15px]">
        <thead class="bg-cream text-sm font-bold text-muted">
          <tr class="h-11">
            <th
              scope="col"
              class="ps-4"
            >
              เลขคำสั่งซื้อ
            </th>
            <th scope="col">
              สถานะ
            </th>
            <th
              scope="col"
              class="text-right"
            >
              ชิ้น
            </th>
            <th
              scope="col"
              class="text-right"
            >
              ยอดคิดแต้ม (บาท)
            </th>
            <th
              scope="col"
              class="pe-4"
            >
              ส่งถึง
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in sampleOrders"
            :key="order.order_no"
            class="h-12 border-t border-default"
          >
            <td class="ps-4 font-number text-ink">
              {{ order.order_no }}
            </td>
            <td>
              {{ FILE_STATUS_LABELS[order.status] }}
              <span class="block text-[13px] text-muted">{{ order.raw_status }}</span>
            </td>
            <td class="text-right font-number">
              {{ order.items.reduce((sum, item) => sum + item.quantity, 0) }}
            </td>
            <td class="text-right font-number font-bold text-ink">
              {{ formatBaht(order.amount_baht) }}
            </td>
            <td class="pe-4 text-muted">
              {{ order.delivered_at ? formatThaiDayMonthTime(order.delivered_at) : '–' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="grouped.problems.length"
      class="mt-5 rounded-xl bg-primary-soft p-4 text-sm text-primary-dark"
      role="alert"
    >
      <p class="font-bold">
        {{ grouped.problems.length.toLocaleString('th-TH') }} แถวอ่านไม่ได้ และจะไม่ถูกนำเข้า
      </p>
      <ul class="mt-2 list-disc ps-5">
        <li
          v-for="problem in grouped.problems.slice(0, 5)"
          :key="problem.rowNumber"
        >
          แถว {{ problem.rowNumber }}: {{ problem.message }}
        </li>
      </ul>
      <p
        v-if="grouped.problems.length > 5"
        class="mt-1"
      >
        และอีก {{ (grouped.problems.length - 5).toLocaleString('th-TH') }} แถว
      </p>
    </div>

    <div
      v-if="isImporting"
      class="mt-6"
    >
      <UProgress
        :model-value="progressPercent"
        aria-label="ความคืบหน้าการนำเข้า"
      />
      <p class="mt-2 text-sm text-muted">
        กำลังนำเข้า {{ progress.sent.toLocaleString('th-TH') }} / {{ progress.total.toLocaleString('th-TH') }} ออเดอร์…
        อย่าปิดหน้านี้
      </p>
    </div>

    <div
      v-else
      class="mt-6 flex flex-wrap gap-3"
    >
      <UButton
        icon="i-lucide-upload"
        class="h-11 rounded-xl px-6 font-heading text-base font-normal"
        :disabled="!grouped.orders.length"
        @click="emit('import')"
      >
        นำเข้า {{ grouped.orders.length.toLocaleString('th-TH') }} ออเดอร์
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        class="h-11 rounded-xl bg-white px-6 font-heading text-base font-normal text-ink ring-[1.5px]"
        @click="emit('cancel')"
      >
        เลือกไฟล์อื่น
      </UButton>
    </div>
  </section>
</template>
