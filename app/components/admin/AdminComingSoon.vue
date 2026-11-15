<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div>
    <AdminPageHeader
      :breadcrumbs="[{ label: 'หน้าแรก', to: '/' }, { label: title }]"
      :title="title"
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
