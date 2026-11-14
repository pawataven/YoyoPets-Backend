<script setup lang="ts">
const backOfficeFeatures = [
  { icon: '/images/back-office/feature-orders.svg', iconWidth: 20, iconHeight: 22, label: 'ตรวจเลขคำสั่งซื้อและให้แต้มสมาชิก' },
  { icon: '/images/back-office/feature-rewards.svg', iconWidth: 20, iconHeight: 20, label: 'จัดการของรางวัล คูปอง และการจัดส่ง' },
  { icon: '/images/back-office/feature-banners.svg', iconWidth: 20, iconHeight: 20, label: 'อัปเดตแบนเนอร์ โปรโมชัน และแจ้งเตือนบนหน้าเว็บ' }
]
</script>

<template>
  <div class="flex min-h-dvh bg-white">
    <aside class="hidden w-[45.83%] shrink-0 flex-col bg-primary px-16 pt-16 pb-[76px] text-white lg:flex 2xl:px-[120px] 2xl:pt-[120px]">
      <NuxtImg
        src="/logo/logo.png"
        alt="YoYo Member"
        width="120"
        height="120"
        class="size-[120px]"
      />
      <p class="mt-6 font-heading text-[56px] leading-none font-bold">
        YoYo Member
      </p>
      <p class="mt-4 text-[22px]">
        ระบบหลังบ้านสำหรับทีมงานร้าน YoYo Pet Shop
      </p>

      <ul class="mt-14 flex flex-col gap-4">
        <li
          v-for="feature in backOfficeFeatures"
          :key="feature.label"
          class="flex items-center gap-5"
        >
          <span class="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/18">
            <img
              :src="feature.icon"
              alt=""
              :width="feature.iconWidth"
              :height="feature.iconHeight"
            >
          </span>
          <span class="text-[19px]">{{ feature.label }}</span>
        </li>
      </ul>

      <p class="mt-auto text-sm">
        © 2026 YoYo Pet Shop
      </p>
    </aside>

    <main class="flex flex-1 items-center justify-center px-6 py-12">
      <div class="w-full max-w-[520px]">
        <p class="mb-10 font-heading text-3xl font-bold text-primary lg:hidden">
          YoYo Member
        </p>
        <slot />
      </div>
    </main>
  </div>
</template>
