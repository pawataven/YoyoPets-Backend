<script setup lang="ts">
export interface AdminBreadcrumb {
  label: string
  to?: string
}

defineProps<{
  breadcrumbs: AdminBreadcrumb[]
  title: string
  description?: string
}>()
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-6">
    <div class="min-w-0">
      <nav
        aria-label="ตำแหน่งของหน้า"
        class="text-sm text-muted"
      >
        <template
          v-for="(crumb, index) in breadcrumbs"
          :key="crumb.label"
        >
          <span
            v-if="index > 0"
            aria-hidden="true"
          > › </span>
          <NuxtLink
            v-if="crumb.to"
            :to="crumb.to"
            class="hover:text-ink hover:underline"
          >
            {{ crumb.label }}
          </NuxtLink>
          <span
            v-else
            aria-current="page"
          >{{ crumb.label }}</span>
        </template>
      </nav>
      <h1 class="mt-2 text-[26px] leading-tight font-bold text-ink sm:mt-3 sm:text-[32px]">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-2 text-sm text-muted sm:text-base"
      >
        {{ description }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="flex flex-wrap items-center gap-3 max-md:w-full md:shrink-0 md:pt-[30px]"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
