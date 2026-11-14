<script setup lang="ts">
defineProps<{
  // Rendered inside the mobile drawer instead of fixed to the left edge
  inDrawer?: boolean
}>()

const route = useRoute()
const { account, signOut } = useAdminAuth()
const { counts } = useWorkQueueCounts()
</script>

<template>
  <aside
    class="flex-col bg-cocoa text-on-cocoa"
    :class="inDrawer ? 'flex h-full w-full' : 'fixed inset-y-0 left-0 z-30 hidden w-[280px] lg:flex'"
  >
    <NuxtLink
      to="/"
      class="flex items-center gap-3 px-8 pt-6 pb-6"
    >
      <NuxtImg
        src="/logo/logo.png"
        alt=""
        width="56"
        height="56"
        class="size-14"
      />
      <span>
        <span class="block font-heading text-xl text-white">YoYo Member</span>
        <span class="block text-sm text-on-cocoa-muted">ระบบหลังบ้าน</span>
      </span>
    </NuxtLink>

    <div class="mx-6 border-t border-white/10" />

    <nav
      aria-label="เมนูหลังบ้าน"
      class="flex-1 overflow-y-auto px-4 pt-4 pb-6"
    >
      <div
        v-for="group in ADMIN_NAV_GROUPS"
        :key="group.label ?? 'main'"
        :class="group.label ? 'mt-5' : undefined"
      >
        <p
          v-if="group.label"
          class="mb-2 px-5 text-[13px] font-bold text-dimmed"
        >
          {{ group.label }}
        </p>
        <ul class="flex flex-col gap-1">
          <li
            v-for="item in group.items"
            :key="item.to"
          >
            <NuxtLink
              :to="item.to"
              class="flex h-12 items-center gap-3 rounded-xl px-6 text-[17px] transition-colors"
              :class="isAdminNavItemActive(route.path, item.to)
                ? 'bg-primary font-bold text-white'
                : 'hover:bg-white/8 hover:text-white'"
              :aria-current="isAdminNavItemActive(route.path, item.to) ? 'page' : undefined"
            >
              <AdminNavIcon
                :icon="item.icon"
                :is-mask-icon="item.isMaskIcon"
              />
              <span class="flex-1">{{ item.label }}</span>
              <span
                v-if="item.badgeCount && counts[item.badgeCount] > 0"
                class="flex h-6 min-w-7 items-center justify-center rounded-full px-2 font-number text-sm font-bold"
                :class="isAdminNavItemActive(route.path, item.to) ? 'bg-white text-primary-dark' : 'bg-primary text-white'"
                :aria-label="`${counts[item.badgeCount]} รายการรอดำเนินการ`"
              >
                {{ counts[item.badgeCount] }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </nav>

    <div
      v-if="account"
      class="m-4 flex items-center gap-3 rounded-2xl bg-white/8 px-5 py-4"
    >
      <AdminAvatar :account="account" />
      <div class="min-w-0 flex-1">
        <p class="truncate font-bold text-white">
          {{ adminDisplayName(account) }}
        </p>
        <p class="truncate text-[13px] text-on-cocoa-muted">
          {{ ADMIN_ROLE_LABELS[account.role] }}
        </p>
      </div>
      <UButton
        color="neutral"
        variant="link"
        icon="i-lucide-log-out"
        aria-label="ออกจากระบบ"
        class="text-on-cocoa-muted hover:text-white"
        @click="signOut()"
      />
    </div>
  </aside>
</template>
