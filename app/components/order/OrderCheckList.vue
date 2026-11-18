<script setup lang="ts" generic="T extends string">
// Excel-style: every box starts ticked and unticking hides rows. An empty list means "no filter",
// so ticking everything again (or unticking the last box) clears the filter instead of hiding every row.
const selected = defineModel<T[]>({ required: true })

const props = defineProps<{
  legend: string
  options: { value: T, label: string }[] | null
}>()

const tickedValues = computed(() => (selected.value.length ? selected.value : (props.options ?? []).map(option => option.value)))

function updateTicked(values: T[]) {
  selected.value = values.length === 0 || values.length === props.options?.length ? [] : values
}
</script>

<template>
  <fieldset>
    <div class="flex items-center justify-between gap-3">
      <legend class="text-[13px] font-bold text-muted">
        {{ legend }}
      </legend>
      <button
        v-if="selected.length"
        type="button"
        class="text-[13px] font-bold text-primary-dark hover:underline"
        @click="selected = []"
      >
        แสดงทั้งหมด
      </button>
    </div>
    <p
      v-if="!options"
      class="mt-2 text-sm text-muted"
    >
      กำลังโหลด…
    </p>
    <p
      v-else-if="!options.length"
      class="mt-2 text-sm text-muted"
    >
      ไม่มีตัวเลือก
    </p>
    <UCheckboxGroup
      v-else
      :model-value="tickedValues as string[]"
      :items="options as { value: string, label: string }[]"
      class="mt-2"
      :ui="{ fieldset: 'gap-2.5', label: 'text-[15px] text-ink' }"
      @update:model-value="updateTicked($event as T[])"
    />
  </fieldset>
</template>
