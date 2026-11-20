<script setup lang="ts">
import { DialogDescription, DialogTitle } from 'reka-ui'
import type { OrderCreditMode, OrderDecisionLine } from '~/types/admin'

// No design: user request 2026-11-17 to recap what is about to be approved before it happens, styled like the reject dialog
const isOpen = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  lines: OrderDecisionLine[]
  creditMode: OrderCreditMode
  isBusy: boolean
}>()

const emit = defineEmits<{
  confirm: []
}>()

// The page clears the lines as it closes the dialog; keep the last ones so the fade-out does not flash "0 รายการ"
const shownLines = ref<OrderDecisionLine[]>([])
watch(() => props.lines, (lines) => {
  if (lines.length) shownLines.value = lines
}, { immediate: true })

const approvableLines = computed(() => shownLines.value.filter(line => !line.skipReason))
const skippedLines = computed(() => shownLines.value.filter(line => line.skipReason))
const totalPoints = computed(() => approvableLines.value.reduce((sum, line) => sum + (line.points ?? 0), 0))

const creditModeText = computed(() => (props.creditMode === 'immediately'
  ? 'ให้แต้มใช้ได้ทันที · ย้ายไปแท็บ "อนุมัติแล้ว"'
  : 'แต้มเข้าเมื่อพ้นระยะคืนสินค้า · ย้ายไปแท็บ "รอพ้นระยะคืนสินค้า" (หรือ "อนุมัติแล้ว" ถ้าพ้นระยะแล้ว)'))
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{
      overlay: 'bg-black/45',
      content: 'max-w-[560px] rounded-3xl ring-0 divide-y-0'
    }"
  >
    <template #content>
      <form @submit.prevent="emit('confirm')">
        <div class="px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
          <DialogTitle class="font-sans text-2xl font-bold text-ink">
            ยืนยันอนุมัติ {{ approvableLines.length.toLocaleString('th-TH') }} รายการ
          </DialogTitle>
          <DialogDescription class="mt-1 text-[15px] text-muted">
            ตรวจสอบรายการอีกครั้งก่อนยืนยัน แต้มจะเข้าบัญชีสมาชิกตามนี้
          </DialogDescription>

          <OrderDecisionList
            v-if="approvableLines.length"
            :lines="approvableLines"
            shows-points
            class="mt-5"
          />
          <p
            v-else
            class="mt-5 rounded-xl bg-neutral-soft px-4 py-3 text-[15px] text-ink"
          >
            ไม่มีรายการที่อนุมัติพร้อมกันได้ เปิด "ตรวจสอบ" ทีละรายการแทน
          </p>

          <dl class="mt-4 space-y-2 text-[15px]">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">
                แต้มรวม
              </dt>
              <dd class="font-number text-lg font-bold text-success">
                +{{ totalPoints.toLocaleString('th-TH') }} แต้ม
              </dd>
            </div>
            <div class="flex items-start justify-between gap-4">
              <dt class="shrink-0 text-muted">
                เมื่ออนุมัติ
              </dt>
              <dd class="text-right text-ink">
                {{ creditModeText }}
              </dd>
            </div>
          </dl>

          <section
            v-if="skippedLines.length"
            class="mt-5"
          >
            <p class="rounded-t-xl bg-gold/30 px-4 py-3 text-sm text-pending">
              <span class="font-bold">จะถูกข้าม {{ skippedLines.length.toLocaleString('th-TH') }} รายการ</span>
              · ยังอยู่ในแท็บรอตรวจ รายการยอดไม่ตรงหรือไม่พบใน Seller Center ต้องเปิดตรวจทีละรายการ เพื่อดูยอดและแก้ยอดที่ใช้คิดแต้ม
            </p>
            <OrderDecisionList
              :lines="skippedLines"
              :shows-points="false"
              class="rounded-t-none border-t-0"
            />
          </section>
        </div>

        <div class="flex justify-end gap-3 border-t border-default px-5 py-4 sm:px-8 sm:py-5">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="isBusy"
            class="h-12 flex-1 justify-center rounded-xl px-7 text-[17px] font-bold text-ink ring-[1.5px] sm:flex-none"
            @click="isOpen = false"
          >
            กลับไปแก้
          </UButton>
          <UButton
            type="submit"
            icon="i-lucide-check"
            :loading="isBusy"
            :disabled="!approvableLines.length"
            class="h-12 flex-1 justify-center rounded-xl px-7 text-[17px] font-bold sm:flex-none"
          >
            ยืนยันอนุมัติ
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
