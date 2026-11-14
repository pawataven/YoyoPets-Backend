<script setup lang="ts">
import type { TopReward } from '~/types/admin'

const props = defineProps<{
  rewards: TopReward[] | null
  // Which period the ranking covers, e.g. "เดือนพฤศจิกายน 2026" or "8–14 พ.ย. 2026"
  description: string
}>()

const BAR_MAX_WIDTH_PX = 200

const highestCount = computed(() => Math.max(1, ...(props.rewards ?? []).map(reward => reward.redemptionCount)))

function barWidthPx(count: number) {
  return Math.max(8, (count / highestCount.value) * BAR_MAX_WIDTH_PX)
}
</script>

<template>
  <DashboardCard
    title="ของรางวัลที่ถูกแลกมากสุด"
    :description="description"
  >
    <div
      v-if="!rewards"
      class="flex flex-col gap-4"
    >
      <USkeleton
        v-for="placeholder in 4"
        :key="placeholder"
        class="h-12 w-full"
      />
    </div>
    <p
      v-else-if="!rewards.length"
      class="py-8 text-center text-sm text-muted"
    >
      ยังไม่มีการแลกของรางวัลในเดือนนี้
    </p>
    <ol
      v-else
      class="flex flex-col gap-5"
    >
      <li
        v-for="reward in rewards"
        :key="reward.id"
        class="flex items-center gap-4"
      >
        <span
          v-if="reward.couponValueBaht !== null"
          class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary font-number text-lg font-bold text-white"
        >
          {{ reward.couponValueBaht }}
        </span>
        <NuxtImg
          v-else-if="reward.imageUrl"
          :src="reward.imageUrl"
          alt=""
          width="48"
          height="48"
          class="size-12 shrink-0 rounded-lg object-cover"
        />
        <span
          v-else
          class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-cream"
        >
          <UIcon
            name="i-lucide-gift"
            class="size-6 text-muted"
          />
        </span>

        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-bold text-ink">
            {{ reward.name }}
          </p>
          <div class="mt-2 flex items-center justify-between gap-3">
            <span
              class="h-2 rounded-full bg-primary"
              :style="{ width: `${barWidthPx(reward.redemptionCount)}px` }"
              aria-hidden="true"
            />
            <span class="shrink-0 text-sm font-bold text-ink">{{ reward.redemptionCount.toLocaleString('th-TH') }} ครั้ง</span>
          </div>
        </div>
      </li>
    </ol>
  </DashboardCard>
</template>
