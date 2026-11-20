<script setup lang="ts">
// Orders are reviewed in the drawer on /orders; links from search results land here
const route = useRoute()

await navigateTo({
  path: '/orders',
  query: { tab: 'all', submitted_within: 'all', review: String(route.params.id) }
}, { replace: true })
</script>

<template>
  <div />
</template>
