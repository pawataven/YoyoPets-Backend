<script setup lang="ts">
import type { ImportField } from '~/types/order-import'

const props = defineProps<{
  headerRow: string[]
  dataRows: string[][]
  missingFields: ImportField[]
  // Without it points wait for the import time instead of the real delivery, so it is asked for but optional
  isDeliveredDateMissing: boolean
}>()

const emit = defineEmits<{
  confirm: [columnIndexByField: Partial<Record<ImportField, number | null>>]
}>()

const NO_COLUMN = -1

const fieldsToAsk = computed(() => [
  ...props.missingFields.map(field => ({ field, isRequired: true })),
  ...(props.isDeliveredDateMissing && !props.missingFields.includes('delivered_at')
    ? [{ field: 'delivered_at' as ImportField, isRequired: false }]
    : [])
])

const chosenColumns = ref<Partial<Record<ImportField, number>>>({})

function samples(columnIndex: number) {
  return props.dataRows.map(row => row[columnIndex]?.trim()).filter(Boolean).slice(0, 3).join(' · ')
}

const columnItems = computed(() => props.headerRow
  .map((header, columnIndex) => ({ label: header.trim() || `คอลัมน์ ${columnIndex + 1}`, value: columnIndex, description: samples(columnIndex) }))
  .filter(item => item.label))

function itemsFor(isRequired: boolean) {
  return isRequired ? columnItems.value : [{ label: 'ไฟล์นี้ไม่มีคอลัมน์นี้', value: NO_COLUMN, description: '' }, ...columnItems.value]
}

const canConfirm = computed(() => fieldsToAsk.value.every(({ field, isRequired }) => !isRequired || chosenColumns.value[field] !== undefined))

function confirm() {
  emit('confirm', Object.fromEntries(fieldsToAsk.value.map(({ field }) => {
    const columnIndex = chosenColumns.value[field]
    return [field, columnIndex === undefined || columnIndex === NO_COLUMN ? null : columnIndex]
  })))
}
</script>

<template>
  <section class="rounded-2xl border-[1.5px] border-default bg-white p-6">
    <h2 class="text-lg font-bold text-ink">
      จับคู่คอลัมน์
    </h2>
    <p class="mt-1 text-sm text-muted">
      ระบบหาคอลัมน์เหล่านี้ในไฟล์ไม่เจอ เลือกครั้งเดียว ระบบจะจำไว้ใช้กับไฟล์ครั้งต่อไป
    </p>

    <div class="mt-5 flex flex-col gap-4">
      <label
        v-for="{ field, isRequired } in fieldsToAsk"
        :key="field"
        class="grid gap-2 sm:grid-cols-[16rem_1fr] sm:items-center"
      >
        <span class="text-[15px] font-bold text-ink">
          {{ IMPORT_FIELD_LABELS[field] }}
          <span
            v-if="!isRequired"
            class="font-normal text-muted"
          >(ไม่บังคับ)</span>
        </span>
        <USelect
          v-model="chosenColumns[field]"
          :items="itemsFor(isRequired)"
          placeholder="เลือกคอลัมน์ในไฟล์"
          :ui="{ base: 'h-11 rounded-xl ring-[1.5px]', itemDescription: 'truncate' }"
        />
      </label>
    </div>

    <p
      v-if="isDeliveredDateMissing"
      class="mt-4 text-[13px] text-muted"
    >
      ถ้าไม่มีวันที่ส่งถึง ระบบจะนับระยะคืนสินค้าจากเวลานำเข้าแทน ซึ่งช้ากว่าความจริง แต้มจะเข้าช้ากว่าที่ควร
    </p>

    <UButton
      class="mt-6 h-11 rounded-xl px-6 font-heading text-base font-normal"
      :disabled="!canConfirm"
      @click="confirm"
    >
      ใช้การจับคู่นี้
    </UButton>
  </section>
</template>
