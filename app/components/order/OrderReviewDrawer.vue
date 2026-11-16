<script setup lang="ts">
import { DialogDescription, DialogTitle } from 'reka-ui'
import type { OrderApproveOptions, OrderCreditMode, OrderDecisionLine } from '~/types/admin'

// Figma 20:1642, opened over the order list
const orderId = defineModel<string | null>('orderId', { required: true })

const props = defineProps<{
  // 1-based position in the filtered list, for "รายการ 1 จาก 24"
  position: number | null
  totalCount: number
  hasPrevious: boolean
  hasNext: boolean
  isBusy: boolean
}>()

const emit = defineEmits<{
  previous: []
  next: []
  approve: [options: OrderApproveOptions, recap: OrderDecisionLine]
  reject: [recap: OrderDecisionLine]
}>()

const POINTS_PREVIEW_DEBOUNCE_MS = 250
const NON_EARNING_RESULTS = ['duplicate', 'cancelled_in_file', 'returned_in_file']

const { detail, isLoading, hasError, calculatePoints } = useOrderReviewDetail(orderId)

const isOpen = computed({
  get: () => orderId.value !== null,
  set: (open) => {
    if (!open) orderId.value = null
  }
})

const amountInput = ref('')
const creditMode = ref<OrderCreditMode>('after_return_window')
const previewPoints = ref<number | null>(null)

const isPending = computed(() => detail.value?.status === 'pending_review')
const canEarnPoints = computed(() => Boolean(detail.value) && !NON_EARNING_RESULTS.includes(detail.value!.matchResult))

watch(detail, (order) => {
  creditMode.value = 'after_return_window'
  const startingAmount = order?.fileRecord?.amountBaht ?? order?.claimedAmountBaht ?? null
  amountInput.value = startingAmount === null ? '' : String(startingAmount)
  previewPoints.value = order?.points ?? null
}, { immediate: true })

const amountBaht = computed(() => {
  const value = Number(amountInput.value.replace(/,/g, ''))
  return amountInput.value.trim() && Number.isFinite(value) && value > 0 ? value : null
})

let previewTimer: ReturnType<typeof setTimeout> | undefined
watch(amountBaht, (amount) => {
  clearTimeout(previewTimer)
  const order = detail.value
  if (!order || amount === null || !canEarnPoints.value) {
    previewPoints.value = null
    return
  }
  previewTimer = setTimeout(async () => {
    try {
      previewPoints.value = await calculatePoints(amount, order.pointsMultiplier)
    } catch {
      previewPoints.value = null
    }
  }, POINTS_PREVIEW_DEBOUNCE_MS)
})
onBeforeUnmount(() => clearTimeout(previewTimer))

const formulaText = computed(() => {
  const order = detail.value
  if (!order || amountBaht.value === null) return ''
  const raw = amountBaht.value / 100 * order.pointsMultiplier
  const rawText = Number.isInteger(raw) ? String(raw) : raw.toLocaleString('th-TH', { maximumFractionDigits: 2 })
  const rounding = Number.isInteger(raw) ? '' : ' → ปัดลง'
  return `${amountBaht.value.toLocaleString('th-TH')} ÷ 100 × ${order.pointsMultiplier} (${order.member.tierName}) = ${rawText}${rounding}`
})

const returnWindowLabel = computed(() => {
  const endsAt = detail.value?.fileRecord?.returnWindowEndsAt
  return endsAt ? `(${formatThaiDayMonth(endsAt)})` : `(${ORDER_RETURN_WINDOW_DAYS} วันหลังอนุมัติ)`
})

const memberVisibleChange = computed(() => {
  const points = previewPoints.value ?? 0
  return creditMode.value === 'after_return_window'
    ? ['สถานะในหน้า "กรอกเลขออเดอร์" เปลี่ยนเป็น "รอพ้นระยะคืนสินค้า"', `แต้มรอยืนยันบนหน้าแรก +${points}`]
    : ['สถานะในหน้า "กรอกเลขออเดอร์" เปลี่ยนเป็น "อนุมัติแล้ว"', `แต้มใช้ได้ทันที +${points}`]
})

const approveBlockedReason = computed(() => {
  if (!canEarnPoints.value) return 'รายการนี้ให้แต้มไม่ได้ ใช้ "ไม่อนุมัติ" แทน'
  if (amountBaht.value === null) return 'กรอกยอดซื้อที่ใช้คำนวณก่อน'
  return null
})

function approve() {
  const order = detail.value
  if (!order || approveBlockedReason.value || props.isBusy) return
  const startingAmount = order.fileRecord?.amountBaht ?? order.claimedAmountBaht
  emit(
    'approve',
    {
      creditMode: creditMode.value,
      amountOverrideBaht: amountBaht.value !== startingAmount ? amountBaht.value! : undefined
    },
    { ...toOrderDecisionLine(order), amountBaht: amountBaht.value, points: previewPoints.value }
  )
}

function reject() {
  if (detail.value) emit('reject', { ...toOrderDecisionLine(detail.value), points: null })
}

const reviewedSummary = computed(() => {
  const order = detail.value
  if (!order || isPending.value) return null
  const reviewer = orderReviewerLabel(order)
  const byline = reviewer && order.reviewedAt ? `${reviewer} · ${formatThaiDateTime(new Date(order.reviewedAt))}` : null
  if (order.status === 'rejected') return { tone: 'bg-primary-soft/70 text-primary-dark', text: `ไม่อนุมัติ · ${order.rejectionReason ?? ''}`, byline }
  if (order.status === 'cancelled') return { tone: 'bg-neutral-soft text-muted', text: 'ยกเลิกแล้ว', byline }
  const points = order.points === null ? '' : ` · +${order.points.toLocaleString('th-TH')} แต้ม`
  const availability = order.pointsAvailableAt ? ` · แต้มใช้ได้ตั้งแต่ ${formatThaiShortDate(order.pointsAvailableAt)}` : ''
  return { tone: 'bg-success/10 text-success', text: `อนุมัติแล้ว${points}${availability}`, byline }
})

// Gmail-style J (next) / K (previous); ignored while typing in a field
function handleKeydown(event: KeyboardEvent) {
  if (!isOpen.value || event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable="true"]')) return
  if (event.key === 'j' && props.hasNext) emit('next')
  if (event.key === 'k' && props.hasPrevious) emit('previous')
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    side="right"
    :ui="{ overlay: 'bg-black/45', content: 'w-full max-w-none divide-y-0 ring-0 sm:max-w-[720px]' }"
  >
    <template #content>
      <div class="flex h-full flex-col bg-white">
        <header class="flex items-start justify-between gap-4 border-b border-default px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
          <div class="min-w-0">
            <DialogTitle class="font-heading text-2xl font-normal text-ink">
              ตรวจสอบคำสั่งซื้อ
            </DialogTitle>
            <DialogDescription class="mt-1 text-[15px] text-muted">
              <template v-if="detail">
                {{ MARKETPLACE_LOGOS[detail.platform].name }} · {{ detail.orderNo }} · ส่งเมื่อ {{ formatThaiDateTime(new Date(detail.submittedAt)) }}
              </template>
              <template v-else>
                กำลังโหลด…
              </template>
            </DialogDescription>
          </div>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-x"
            aria-label="ปิด"
            class="size-10 shrink-0 justify-center rounded-full bg-neutral-soft text-ink hover:bg-primary-soft"
            @click="isOpen = false"
          />
        </header>

        <div class="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <UAlert
            v-if="hasError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            title="โหลดคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่"
          />
          <div
            v-else-if="!detail"
            class="flex flex-col gap-4"
            aria-busy="true"
          >
            <USkeleton class="h-12 w-2/3" />
            <USkeleton class="h-56 w-full rounded-2xl" />
            <USkeleton class="h-24 w-full" />
          </div>

          <div
            v-else
            class="transition-opacity"
            :class="isLoading ? 'opacity-60' : undefined"
          >
            <div class="flex items-center gap-3">
              <span
                aria-hidden="true"
                class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-lg text-primary-dark"
              >
                {{ detail.member.fullName.charAt(0) }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[17px] font-bold text-ink">
                  {{ detail.member.fullName }}
                </p>
                <p class="truncate text-sm text-muted">
                  {{ detail.member.memberCode }}<template v-if="detail.memberPhone">
                    · {{ formatThaiPhone(detail.memberPhone) }}
                  </template>
                </p>
              </div>
              <span class="shrink-0 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-bold text-primary-dark">
                {{ detail.member.tierName }} · ×{{ detail.pointsMultiplier }}
              </span>
            </div>

            <OrderFileCheckCard
              :order="detail"
              class="mt-6"
            />

            <h3 class="mt-6 font-sans text-[15px] font-bold text-ink">
              สินค้าในคำสั่งซื้อ
            </h3>
            <ul
              v-if="detail.items.length"
              class="mt-3 flex flex-col gap-2"
            >
              <li
                v-for="item in detail.items"
                :key="item.id"
                class="flex items-center gap-3 text-[15px]"
              >
                <span
                  aria-hidden="true"
                  class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-cream text-dimmed"
                >
                  <UIcon
                    name="i-lucide-package"
                    class="size-6"
                  />
                </span>
                <span class="min-w-0 flex-1 text-ink">{{ item.productName }} × {{ item.quantity }}</span>
                <span class="shrink-0 font-bold text-ink">{{ item.totalBaht.toLocaleString('th-TH') }} บาท</span>
              </li>
            </ul>
            <p
              v-else
              class="mt-2 text-sm text-muted"
            >
              ยังไม่มีรายการสินค้า จะแสดงเมื่อพบคำสั่งซื้อในไฟล์ร้าน
            </p>

            <div class="mt-6 flex flex-col gap-5 sm:flex-row sm:gap-6">
              <a
                v-if="detail.proofImageUrl"
                :href="detail.proofImageUrl"
                target="_blank"
                rel="noopener"
                class="block h-28 w-40 shrink-0 overflow-hidden rounded-xl ring-[1.5px] ring-default hover:ring-primary"
                aria-label="เปิดรูปที่สมาชิกแนบ"
              >
                <img
                  :src="detail.proofImageUrl"
                  alt="รูปที่สมาชิกแนบ"
                  class="size-full object-cover"
                >
              </a>
              <div
                v-else
                class="flex h-28 w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-accented bg-cream text-sm text-dimmed"
              >
                <UIcon
                  name="i-lucide-image"
                  class="size-7"
                />
                ไม่มีรูปที่สมาชิกแนบ
              </div>

              <div
                v-if="isPending"
                class="min-w-0 flex-1"
              >
                <label
                  for="order-review-amount"
                  class="font-bold text-ink"
                >
                  ยอดซื้อที่ใช้คำนวณ
                </label>
                <UInput
                  id="order-review-amount"
                  v-model="amountInput"
                  inputmode="decimal"
                  :disabled="!canEarnPoints"
                  class="mt-2 w-full"
                  :ui="{ base: 'h-12 rounded-xl ps-4 pe-14 font-number text-base ring-[1.5px]', trailing: 'pe-4' }"
                >
                  <template #trailing>
                    <span class="text-[15px] text-muted">บาท</span>
                  </template>
                </UInput>
                <div class="mt-3 flex items-center justify-between gap-3">
                  <p class="min-w-0 text-sm text-muted">
                    {{ canEarnPoints ? formulaText : 'รายการนี้ไม่ได้แต้ม' }}
                  </p>
                  <p
                    class="shrink-0 font-number text-[22px] font-bold"
                    :class="previewPoints === null ? 'text-dimmed' : 'text-success'"
                    aria-live="polite"
                  >
                    {{ previewPoints === null ? '–' : `+${previewPoints.toLocaleString('th-TH')}` }} <span class="font-sans">แต้ม</span>
                  </p>
                </div>
              </div>
            </div>

            <template v-if="isPending && canEarnPoints">
              <fieldset class="mt-6">
                <legend class="font-bold text-ink">
                  เมื่ออนุมัติ
                </legend>
                <URadioGroup
                  v-model="creditMode"
                  :items="[
                    { value: 'after_return_window', label: `แต้มเข้าเมื่อพ้นระยะคืนสินค้า ${returnWindowLabel} · แนะนำ` },
                    { value: 'immediately', label: 'ให้แต้มใช้ได้ทันที' }
                  ]"
                  class="mt-3"
                  :ui="{ fieldset: 'gap-3', label: 'text-[15px] font-normal text-ink', base: 'size-5 ring-[1.5px] ring-accented' }"
                />
              </fieldset>

              <section class="mt-6 rounded-2xl bg-cream px-5 py-4">
                <p class="flex items-center gap-2 font-bold text-primary-dark">
                  <UIcon
                    name="i-lucide-globe"
                    class="size-5"
                  />
                  สมาชิกจะเห็นบนหน้าเว็บ
                </p>
                <ul class="mt-2 ps-7 text-sm text-ink">
                  <li
                    v-for="line in memberVisibleChange"
                    :key="line"
                    class="mt-1"
                  >
                    {{ line }}
                  </li>
                </ul>
              </section>
            </template>

            <p
              v-else-if="reviewedSummary"
              class="mt-6 rounded-2xl px-5 py-4 font-bold"
              :class="reviewedSummary.tone"
            >
              {{ reviewedSummary.text }}
              <span
                v-if="reviewedSummary.byline"
                class="mt-1 block text-sm font-normal"
              >
                {{ reviewedSummary.byline }}
              </span>
            </p>
          </div>
        </div>

        <footer class="flex flex-col gap-3 border-t border-default px-5 py-4 sm:flex-row sm:items-center sm:px-8 sm:py-5">
          <p class="text-[13px] text-muted sm:mr-auto">
            <template v-if="position">
              รายการ {{ position.toLocaleString('th-TH') }} จาก {{ totalCount.toLocaleString('th-TH') }}
            </template>
            <span class="max-sm:hidden"> · กด J/K เพื่อเลื่อน</span>
          </p>
          <div
            v-if="detail && isPending"
            class="flex gap-3"
          >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-x"
              :disabled="isBusy"
              class="h-12 flex-1 justify-center rounded-xl px-5 font-heading text-base font-normal text-primary-dark ring-[1.5px] ring-primary/60 hover:bg-primary-soft sm:flex-none"
              @click="reject"
            >
              ไม่อนุมัติ
            </UButton>
            <UTooltip
              :text="approveBlockedReason ?? undefined"
              :disabled="!approveBlockedReason"
              :ui="{ content: 'max-w-xs' }"
              class="flex-1 sm:flex-none"
            >
              <UButton
                icon="i-lucide-check"
                :loading="isBusy"
                :disabled="Boolean(approveBlockedReason)"
                class="h-12 w-full justify-center rounded-xl px-4 text-[15px] font-bold whitespace-nowrap sm:w-auto sm:px-6 sm:text-base"
                @click="approve"
              >
                อนุมัติ{{ previewPoints ? ` +${previewPoints.toLocaleString('th-TH')} แต้ม` : '' }}
              </UButton>
            </UTooltip>
          </div>
        </footer>
      </div>
    </template>
  </USlideover>
</template>
