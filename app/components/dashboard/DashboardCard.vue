<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  // Wide actions (the chart legend) move under the title on phones; short links stay top-right
  stackActionsOnMobile?: boolean
}>()
</script>

<template>
  <section class="flex min-w-0 flex-col rounded-2xl border-[1.5px] border-default bg-white px-4 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
    <header
      class="flex items-start justify-between gap-x-4 gap-y-3"
      :class="stackActionsOnMobile ? 'max-sm:flex-col' : undefined"
    >
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-normal text-ink sm:text-xl">
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="mt-1 text-sm text-muted"
        >
          {{ description }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="flex shrink-0 items-center gap-6 pt-1"
      >
        <slot name="actions" />
      </div>
    </header>
    <div class="mt-5 flex-1">
      <slot />
    </div>
  </section>
</template>
