<script setup lang="ts">
import type { OrderDecisionLine } from '~/types/admin'

defineProps<{
  lines: OrderDecisionLine[]
  showsPoints: boolean
}>()
</script>

<template>
  <ul class="max-h-64 divide-y divide-default overflow-y-auto rounded-2xl border-[1.5px] border-default">
    <li
      v-for="line in lines"
      :key="line.id"
      class="flex items-center gap-3 px-4 py-3"
    >
      <NuxtImg
        :src="MARKETPLACE_LOGOS[line.platform].src"
        :alt="MARKETPLACE_LOGOS[line.platform].name"
        width="28"
        height="28"
        class="size-7 shrink-0"
      />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-number text-[15px] font-bold text-ink">{{ line.orderNo }}</span>
        <span class="block truncate text-[13px] text-muted">{{ line.memberName }} · {{ line.memberCode }}</span>
      </span>
      <span class="shrink-0 text-right">
        <span class="block text-sm font-bold text-ink">
          {{ line.amountBaht === null ? '–' : `${line.amountBaht.toLocaleString('th-TH')} บาท` }}
        </span>
        <span
          v-if="showsPoints"
          class="block font-number text-sm font-bold"
          :class="line.points ? 'text-success' : 'text-dimmed'"
        >
          {{ line.points ? `+${line.points.toLocaleString('th-TH')} แต้ม` : 'ไม่ได้แต้ม' }}
        </span>
      </span>
    </li>
  </ul>
</template>
