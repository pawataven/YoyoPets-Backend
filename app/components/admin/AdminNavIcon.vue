<script setup lang="ts">
defineProps<{
  icon: string
  // A public SVG drawn as a mask, so it takes the current text colour like a Lucide icon
  isMaskIcon?: boolean
}>()
</script>

<template>
  <span
    v-if="isMaskIcon"
    aria-hidden="true"
    class="size-5 shrink-0 bg-current"
    :style="{ maskImage: `url(${icon})`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }"
  />
  <UIcon
    v-else
    :name="icon"
    class="size-5 shrink-0"
  />
</template>
