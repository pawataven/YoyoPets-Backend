<script setup lang="ts">
import type { OrderReviewSort, OrderSortKey } from '~/types/admin'

// A table header that opens a small menu: sort buttons for sortable columns, then the column's filter (default slot)
const sort = defineModel<OrderReviewSort>('sort', { required: true })

const props = withDefaults(defineProps<{
  label: string
  sortKey?: OrderSortKey
  // [descending, ascending]
  sortLabels?: [string, string]
  isFiltered?: boolean
  align?: 'start' | 'end'
}>(), {
  sortKey: undefined,
  sortLabels: () => ['ล่าสุดก่อน', 'เก่าสุดก่อน'],
  isFiltered: false,
  align: 'start'
})

const isOpen = ref(false)

const isSortedHere = computed(() => props.sortKey !== undefined && sort.value.key === props.sortKey)

const sortChoices = computed(() => [
  { ascending: false, label: props.sortLabels[0] },
  { ascending: true, label: props.sortLabels[1] }
])

function isSortInUse(ascending: boolean) {
  return isSortedHere.value && sort.value.ascending === ascending
}

function chooseSort(ascending: boolean) {
  sort.value = { key: props.sortKey!, ascending }
  isOpen.value = false
}

function close() {
  isOpen.value = false
}
</script>

<template>
  <UPopover
    v-model:open="isOpen"
    :content="{ align, sideOffset: 6, collisionPadding: 16 }"
    :ui="{ content: 'rounded-2xl shadow-xl ring-default' }"
  >
    <button
      type="button"
      class="-mx-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold transition-colors hover:bg-white hover:text-ink focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      :class="isOpen || isSortedHere || isFiltered ? 'text-ink' : undefined"
    >
      {{ label }}
      <UIcon
        v-if="isSortedHere"
        :name="sort.ascending ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
        class="size-4"
      />
      <span
        v-if="isFiltered"
        class="size-2 rounded-full bg-primary"
      />
      <span
        v-if="isFiltered"
        class="sr-only"
      >(กรองอยู่)</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-3.5 text-dimmed"
      />
    </button>

    <template #content>
      <div class="w-[min(300px,calc(100vw-2rem))] py-3 text-left font-sans font-normal">
        <div
          v-if="sortKey"
          role="group"
          aria-label="เรียง"
          class="px-2"
        >
          <p class="px-2 pb-1 text-[13px] font-bold text-muted">
            เรียง
          </p>
          <button
            v-for="choice in sortChoices"
            :key="choice.label"
            type="button"
            class="flex h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[15px] transition-colors"
            :class="isSortInUse(choice.ascending) ? 'bg-primary-soft font-bold text-primary-dark' : 'text-ink hover:bg-cream'"
            :aria-pressed="isSortInUse(choice.ascending)"
            @click="chooseSort(choice.ascending)"
          >
            <span class="inline-flex items-center gap-2">
              <UIcon
                :name="choice.ascending ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                class="size-4"
              />
              {{ choice.label }}
            </span>
            <UIcon
              v-if="isSortInUse(choice.ascending)"
              name="i-lucide-check"
              class="size-5 shrink-0"
            />
          </button>
        </div>

        <div
          v-if="$slots.default"
          class="flex flex-col gap-4 px-4"
          :class="sortKey ? 'mt-3 border-t border-default pt-3' : undefined"
        >
          <slot :close="close" />
        </div>
      </div>
    </template>
  </UPopover>
</template>
