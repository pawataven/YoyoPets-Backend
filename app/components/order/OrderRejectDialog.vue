<script setup lang="ts">
import { DialogDescription, DialogTitle } from 'reka-ui'

// No design yet: styled after the export dialog. The reason is stored with the order so the member can see why.
const isOpen = defineModel<boolean>('open', { required: true })

defineProps<{
  orderCount: number
  isBusy: boolean
}>()

const emit = defineEmits<{
  confirm: [reason: string]
}>()

const COMMON_REASONS = [
  'ไม่พบคำสั่งซื้อในไฟล์ร้าน',
  'ยอดซื้อไม่ตรงกับไฟล์ร้าน',
  'เลขคำสั่งซื้อนี้ถูกใช้แล้ว',
  'คำสั่งซื้อถูกยกเลิกหรือคืนสินค้า'
]

const reason = ref('')

watch(isOpen, (open) => {
  if (open) reason.value = ''
})

function confirmReject() {
  const trimmedReason = reason.value.trim()
  if (!trimmedReason) return
  emit('confirm', trimmedReason)
}
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
      <form @submit.prevent="confirmReject">
        <div class="px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
          <DialogTitle class="font-sans text-2xl font-bold text-ink">
            ไม่อนุมัติ {{ orderCount.toLocaleString('th-TH') }} รายการ
          </DialogTitle>
          <DialogDescription class="mt-1 text-[15px] text-muted">
            สมาชิกจะเห็นเหตุผลนี้ในประวัติคำสั่งซื้อ
          </DialogDescription>

          <div class="mt-6 flex flex-wrap gap-2">
            <button
              v-for="commonReason in COMMON_REASONS"
              :key="commonReason"
              type="button"
              class="rounded-full px-3.5 py-1.5 text-sm ring-[1.5px] ring-inset transition-colors"
              :class="reason === commonReason ? 'bg-primary-soft font-bold text-primary-dark ring-primary' : 'bg-white text-ink ring-default hover:bg-cream'"
              @click="reason = commonReason"
            >
              {{ commonReason }}
            </button>
          </div>

          <UTextarea
            v-model="reason"
            :rows="3"
            autoresize
            placeholder="หรือพิมพ์เหตุผลเอง"
            aria-label="เหตุผลที่ไม่อนุมัติ"
            class="mt-4 w-full"
            :ui="{ base: 'rounded-xl px-4 py-3 text-[15px] ring-[1.5px]' }"
          />
        </div>

        <div class="flex justify-end gap-3 border-t border-default px-5 py-4 sm:px-8 sm:py-5">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="isBusy"
            class="h-12 flex-1 justify-center rounded-xl px-7 text-[17px] font-bold text-ink ring-[1.5px] sm:flex-none"
            @click="isOpen = false"
          >
            ยกเลิก
          </UButton>
          <UButton
            type="submit"
            icon="i-lucide-x"
            :loading="isBusy"
            :disabled="!reason.trim()"
            class="h-12 flex-1 justify-center rounded-xl px-7 text-[17px] font-bold sm:flex-none"
          >
            ไม่อนุมัติ
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
