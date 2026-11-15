<script setup lang="ts">
// Placeholder for sidebar destinations whose systems are not built yet; anything else is a real 404
const route = useRoute()

const pageTitle = computed(() => placeholderPageTitle(route.path))

if (!pageTitle.value) {
  throw createError({ statusCode: 404, statusMessage: 'ไม่พบหน้านี้', fatal: true })
}

useSeoMeta({ title: () => `${pageTitle.value} · YoyoPet Admin` })
</script>

<template>
  <AdminComingSoon :title="pageTitle ?? ''" />
</template>
