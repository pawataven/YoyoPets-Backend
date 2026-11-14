<script setup lang="ts">
import type { TeamActivity } from '~/types/admin'

defineProps<{
  activity: TeamActivity[] | null
}>()

// "คุณบีม" → "บ", same rule as the admin avatar
function adminInitial(adminName: string) {
  return Array.from(adminName.replace(/^คุณ\s*/, ''))[0] ?? '?'
}
</script>

<template>
  <DashboardCard title="กิจกรรมล่าสุดของทีม">
    <template #actions>
      <NuxtLink
        to="/activity"
        class="text-[15px] font-bold text-primary-dark hover:underline"
      >
        ดูทั้งหมด ›
      </NuxtLink>
    </template>

    <div
      v-if="!activity"
      class="flex flex-col gap-4"
    >
      <USkeleton
        v-for="placeholder in 5"
        :key="placeholder"
        class="h-10 w-full"
      />
    </div>
    <p
      v-else-if="!activity.length"
      class="py-8 text-center text-sm text-muted"
    >
      ยังไม่มีกิจกรรม
    </p>
    <ol
      v-else
      class="flex flex-col gap-5"
    >
      <li
        v-for="item in activity"
        :key="item.id"
        class="flex gap-3"
      >
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-[13px] text-primary-dark"
          aria-hidden="true"
        >
          {{ adminInitial(item.adminName) }}
        </span>
        <div class="min-w-0">
          <p class="text-[13px] text-muted">
            {{ item.adminName }} · {{ formatActivityTime(item.occurredAt) }}
          </p>
          <p class="truncate text-[15px] text-ink">
            {{ item.description }}
          </p>
        </div>
      </li>
    </ol>
  </DashboardCard>
</template>
