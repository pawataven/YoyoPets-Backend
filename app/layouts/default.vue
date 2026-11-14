<script setup lang="ts">
import { DialogTitle } from 'reka-ui'

const route = useRoute()

// Below lg the sidebar is a drawer opened from the top bar
const isNavigationOpen = ref(false)

watch(() => route.fullPath, () => {
  isNavigationOpen.value = false
})
</script>

<template>
  <div class="min-h-dvh bg-cream">
    <AdminSidebar />

    <USlideover
      v-model:open="isNavigationOpen"
      side="left"
      :ui="{ content: 'w-[280px] max-w-[85vw] bg-cocoa' }"
    >
      <template #content>
        <DialogTitle class="sr-only">
          เมนูหลังบ้าน
        </DialogTitle>
        <AdminSidebar in-drawer />
      </template>
    </USlideover>

    <div class="lg:pl-[280px]">
      <AdminTopbar @open-navigation="isNavigationOpen = true" />
      <main class="px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-[22px] lg:pb-12">
        <slot />
      </main>
    </div>
  </div>
</template>
