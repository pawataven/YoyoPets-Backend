<script setup lang="ts">
defineProps<{
  label: string
  icon: string
  isMaskIcon?: boolean
  iconClass: string
  value: number | null
  unit: string
  trend?: string
  trendClass?: string
  // Loading failed: show a dash instead of an endless skeleton
  isUnavailable?: boolean
}>()
</script>

<template>
  <section class="min-w-0 rounded-2xl border-[1.5px] border-default bg-white p-4 sm:p-6">
    <div class="flex items-center gap-3">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-full"
        :class="iconClass"
      >
        <AdminNavIcon
          :icon="icon"
          :is-mask-icon="isMaskIcon"
        />
      </span>
      <h2 class="font-sans text-[15px] font-normal text-muted">
        {{ label }}
      </h2>
    </div>

    <div class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span
        v-if="isUnavailable"
        class="font-number text-[40px] leading-none font-bold text-dimmed"
        title="โหลดข้อมูลไม่สำเร็จ"
      >–</span>
      <USkeleton
        v-else-if="value === null"
        class="h-12 w-32"
      />
      <template v-else>
        <span class="font-number text-[32px] leading-none font-bold text-ink sm:text-[40px]">{{ value.toLocaleString('th-TH') }}</span>
        <span class="text-base text-muted">{{ unit }}</span>
        <span
          v-if="trend"
          class="ml-auto text-sm font-bold"
          :class="trendClass ?? 'text-muted'"
        >{{ trend }}</span>
      </template>
    </div>
  </section>
</template>
