<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <header class="mb-10">
    <h1 class="text-[32px] leading-tight font-bold text-ink sm:text-[40px]">
      {{ title }}
    </h1>
    <p class="mt-1 text-[17px] text-muted">
      {{ description }}
    </p>
  </header>
</template>
