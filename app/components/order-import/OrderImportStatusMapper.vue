<script setup lang="ts">
import type { FileOrderStatus, UnknownStatus } from '~/types/order-import'

const props = defineProps<{
  unknownStatuses: UnknownStatus[]
}>()

const emit = defineEmits<{
  confirm: [statusByRawStatus: Record<string, FileOrderStatus>]
}>()

const chosenStatuses = ref<Record<string, FileOrderStatus | undefined>>({})

const statusItems = FILE_STATUS_OPTIONS.map(option => ({ label: option.label, value: option.value, description: option.hint }))

const canConfirm = computed(() => props.unknownStatuses.every(unknown => chosenStatuses.value[unknown.rawStatus]))

function confirm() {
  emit('confirm', Object.fromEntries(props.unknownStatuses.map(unknown => [unknown.rawStatus, chosenStatuses.value[unknown.rawStatus]!])))
}
</script>

<template>
  <section class="rounded-2xl border-[1.5px] border-default bg-white p-6">
    <h2 class="text-lg font-bold text-ink">
      สถานะที่ระบบยังไม่รู้จัก
    </h2>
    <p class="mt-1 text-sm text-muted">
      บอกระบบว่าสถานะเหล่านี้หมายถึงอะไร ระบบจะจำไว้และไม่ถามอีก ถ้าไม่แน่ใจ ดูความหมายในหน้าคำสั่งซื้อของ Seller Center ก่อน
    </p>

    <div class="mt-5 flex flex-col gap-4">
      <label
        v-for="unknown in unknownStatuses"
        :key="unknown.rawStatus"
        class="grid gap-2 sm:grid-cols-[16rem_1fr] sm:items-center"
      >
        <span>
          <span class="block text-[15px] font-bold text-ink">"{{ unknown.rawStatus || '(ว่าง)' }}"</span>
          <span class="block text-[13px] text-muted">พบ {{ unknown.rowCount.toLocaleString('th-TH') }} แถว</span>
        </span>
        <USelect
          v-model="chosenStatuses[unknown.rawStatus]"
          :items="statusItems"
          placeholder="หมายถึง…"
          :ui="{ base: 'h-11 rounded-xl ring-[1.5px]' }"
        />
      </label>
    </div>

    <UButton
      class="mt-6 h-11 rounded-xl px-6 font-heading text-base font-normal"
      :disabled="!canConfirm"
      @click="confirm"
    >
      บันทึกความหมายสถานะ
    </UButton>
  </section>
</template>
