<script setup lang="ts">
import type { AdminAccount } from '~/types/admin'

withDefaults(defineProps<{
  account: AdminAccount
  size?: 'md' | 'lg'
}>(), {
  size: 'md'
})
</script>

<template>
  <span
    aria-hidden="true"
    class="flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-lg text-primary-dark"
    :class="size === 'lg' ? 'size-11' : 'size-10'"
  >
    {{ adminAvatarInitial(account) }}
  </span>
</template>
