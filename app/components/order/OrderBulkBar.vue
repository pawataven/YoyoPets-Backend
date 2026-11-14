<script setup lang="ts">
defineProps<{
  selectedCount: number
  totalPoints: number
  isBusy: boolean
}>()

defineEmits<{
  clear: []
  approve: []
  reject: []
}>()
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-xl bg-cocoa px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:py-2 sm:ps-6 sm:pe-3"
    role="region"
    aria-label="จัดการรายการที่เลือก"
  >
    <div class="flex flex-wrap items-center gap-x-[72px] gap-y-1">
      <p
        class="font-bold text-white"
        aria-live="polite"
      >
        เลือก {{ selectedCount.toLocaleString('th-TH') }} รายการ · รวม {{ totalPoints.toLocaleString('th-TH') }} แต้ม
      </p>
      <button
        type="button"
        class="text-[15px] font-bold text-on-cocoa-link hover:underline"
        @click="$emit('clear')"
      >
        ยกเลิกการเลือก
      </button>
    </div>

    <div class="flex gap-3 sm:ml-auto">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-x"
        :disabled="isBusy"
        class="h-10 flex-1 justify-center rounded-lg bg-white px-5 font-heading text-base font-normal text-ink sm:w-40 sm:flex-none"
        @click="$emit('reject')"
      >
        ไม่อนุมัติ
      </UButton>
      <UButton
        icon="i-lucide-check"
        :loading="isBusy"
        class="h-10 flex-1 justify-center rounded-lg px-5 font-heading text-base font-normal sm:w-44 sm:flex-none"
        @click="$emit('approve')"
      >
        อนุมัติที่เลือก
      </UButton>
    </div>
  </div>
</template>
