<script setup lang="ts">
import type { OrderReviewDetail, PlatformOrderStatus } from '~/types/admin'

const props = defineProps<{
  order: OrderReviewDetail
}>()

const FILE_RECORD_STATUS_LABELS: Record<PlatformOrderStatus, string> = {
  pending: 'ยังไม่จัดส่ง',
  completed: 'จัดส่งสำเร็จ',
  closed: 'จบแล้ว คืนไม่ได้',
  cancelled: 'ยกเลิก',
  returned: 'คืนสินค้า'
}

const returnWindowDays = useReturnWindowDays()

const TONES = {
  success: { card: 'bg-success/10', heading: 'text-success', icon: 'i-lucide-check' },
  waiting: { card: 'bg-gold-soft', heading: 'text-pending', icon: 'i-lucide-circle-alert' },
  failed: { card: 'bg-primary-soft/70', heading: 'text-primary-dark', icon: 'i-lucide-circle-x' }
}

const platformName = computed(() => MARKETPLACE_LOGOS[props.order.platform].name)

const summary = computed(() => {
  const order = props.order
  const imported = order.fileRecord ? ` (นำเข้า ${formatThaiDayMonthTime(order.fileRecord.importedAt)})` : ''
  switch (order.matchResult) {
    case 'matched':
      return { tone: TONES.success, heading: `พบในไฟล์ ${platformName.value}${imported}` }
    case 'amount_mismatch':
      return { tone: TONES.waiting, heading: `พบในไฟล์ ${platformName.value} แต่ยอดไม่ตรง${imported}` }
    case 'not_in_file':
      return { tone: TONES.waiting, heading: `ยังไม่พบในไฟล์ ${platformName.value} · นำเข้าไฟล์ล่าสุดก่อนอนุมัติ` }
    case 'duplicate':
      return { tone: TONES.failed, heading: `เลขซ้ำ · สมาชิก ${order.duplicateOfMemberCode ?? ''} ส่งเลขนี้ก่อน` }
    case 'cancelled_in_file':
      return { tone: TONES.failed, heading: `คำสั่งซื้อถูกยกเลิกในไฟล์ ${platformName.value}${imported}` }
    case 'returned_in_file':
      return { tone: TONES.failed, heading: `สินค้าถูกคืนในไฟล์ ${platformName.value}${imported}` }
  }
  return { tone: TONES.waiting, heading: '' }
})

const fileStatusText = computed(() => {
  const record = props.order.fileRecord
  if (!record) return '–'
  const label = FILE_RECORD_STATUS_LABELS[record.status]
  return record.status === 'completed' && record.deliveredAt ? `${label} ${formatThaiShortDate(record.deliveredAt)}` : label
})

function formatBaht(amount: number | null) {
  return amount === null ? '–' : `${amount.toLocaleString('th-TH')} บาท`
}
</script>

<template>
  <section
    class="rounded-2xl px-6 py-5"
    :class="summary.tone.card"
  >
    <p
      class="flex items-start gap-2.5 font-bold"
      :class="summary.tone.heading"
    >
      <UIcon
        :name="summary.tone.icon"
        class="mt-0.5 size-5 shrink-0"
      />
      {{ summary.heading }}
    </p>

    <dl class="mt-4 flex flex-col gap-3 ps-7.5 text-[15px]">
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          สถานะในไฟล์
        </dt>
        <dd class="text-right font-bold text-ink">
          {{ fileStatusText }}
        </dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          ยอดในไฟล์ (ไม่รวมค่าส่ง)
        </dt>
        <dd class="text-right font-bold text-ink">
          {{ formatBaht(order.fileRecord?.amountBaht ?? null) }}
        </dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          ยอดที่สมาชิกแจ้ง
        </dt>
        <dd
          class="text-right font-bold"
          :class="order.matchResult === 'amount_mismatch' ? 'text-pending' : 'text-ink'"
        >
          {{ formatBaht(order.claimedAmountBaht) }}
        </dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          เลขนี้เคยใช้สะสมแต้ม
        </dt>
        <dd
          class="text-right font-bold"
          :class="order.duplicateOfMemberCode ? 'text-primary-dark' : 'text-success'"
        >
          {{ order.duplicateOfMemberCode ? `เคย · ${order.duplicateOfMemberCode}` : 'ไม่เคย' }}
        </dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          พ้นระยะคืนสินค้า<template v-if="returnWindowDays"> ({{ returnWindowDays[order.platform] }} วันหลังส่งถึง)</template>
        </dt>
        <dd class="text-right font-bold text-ink">
          {{ order.fileRecord?.returnWindowEndsAt ? formatThaiShortDate(order.fileRecord.returnWindowEndsAt) : 'รอวันส่งถึงจากไฟล์' }}
        </dd>
      </div>
    </dl>
  </section>
</template>
