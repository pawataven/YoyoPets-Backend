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
  <div>
    <AdminPageHeader
      :breadcrumbs="[{ label: 'หน้าแรก', to: '/' }, { label: pageTitle ?? '' }]"
      :title="pageTitle ?? ''"
    />

    <div class="mt-8 rounded-2xl border-2 border-dashed border-default bg-white/60 px-8 py-16 text-center">
      <UIcon
        name="i-lucide-hammer"
        class="size-8 text-dimmed"
      />
      <p class="mt-3 font-bold text-ink">
        หน้านี้กำลังพัฒนา
      </p>
      <p class="mt-1 text-sm text-muted">
        ระบบส่วนนี้จะเปิดใช้เมื่อพร้อม ระหว่างนี้ใช้เมนูอื่นได้ตามปกติ
      </p>
    </div>
  </div>
</template>
