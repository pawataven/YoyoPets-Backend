<script setup lang="ts">
import type { TopSpenderEntry } from '~/types/admin'

defineProps<{
  entries: TopSpenderEntry[] | null
  monthName: string
  closingNote: string
}>()

const MEDAL_CLASSES: Record<number, string> = {
  1: 'bg-medal-gold text-white',
  2: 'bg-medal-silver text-white',
  3: 'bg-medal-bronze text-white'
}
</script>

<template>
  <DashboardCard
    :title="`Top Spender ${monthName}`"
    :description="closingNote"
  >
    <template #actions>
      <NuxtLink
        to="/top-spender"
        class="text-[15px] font-bold text-primary-dark hover:underline"
      >
        จัดการ ›
      </NuxtLink>
    </template>

    <div
      v-if="!entries"
      class="flex flex-col gap-4"
    >
      <USkeleton
        v-for="placeholder in 5"
        :key="placeholder"
        class="h-8 w-full"
      />
    </div>
    <p
      v-else-if="!entries.length"
      class="py-8 text-center text-sm text-muted"
    >
      ยังไม่มียอดซื้อในเดือนนี้
    </p>
    <ol
      v-else
      class="flex flex-col gap-6"
    >
      <li
        v-for="entry in entries"
        :key="entry.rank"
        class="flex items-center gap-3"
      >
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full font-number text-[15px] font-bold"
          :class="MEDAL_CLASSES[entry.rank] ?? 'bg-neutral-soft text-muted'"
          :aria-label="`อันดับ ${entry.rank}`"
        >
          {{ entry.rank }}
        </span>
        <span class="min-w-0 flex-1 truncate text-[15px] text-ink">{{ entry.memberName }}</span>
        <span class="shrink-0 text-[15px] font-bold text-ink">{{ entry.spendBaht.toLocaleString('th-TH') }} บาท</span>
      </li>
    </ol>
  </DashboardCard>
</template>
