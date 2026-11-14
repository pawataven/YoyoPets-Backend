<script setup lang="ts">
const emit = defineEmits<{
  openNavigation: []
}>()

const { public: { memberSiteUrl } } = useRuntimeConfig()
const { account } = useAdminAuth()
const { unreadCount } = useAdminNotifications()

const isNotificationsOpen = ref(false)
const isAccountMenuOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-default bg-white px-4 sm:gap-3 sm:px-6 lg:h-20 lg:gap-6 lg:px-10">
    <button
      type="button"
      class="flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream lg:hidden"
      aria-label="เปิดเมนู"
      @click="emit('openNavigation')"
    >
      <UIcon
        name="i-lucide-menu"
        class="size-6"
      />
    </button>

    <AdminGlobalSearch />

    <a
      :href="memberSiteUrl"
      target="_blank"
      rel="noopener"
      class="ml-auto flex shrink-0 items-center gap-2 rounded-full font-bold text-primary-dark hover:underline max-xl:size-10 max-xl:justify-center max-xl:hover:bg-cream"
      aria-label="ดูหน้าเว็บสมาชิก"
    >
      <UIcon
        name="i-lucide-external-link"
        class="size-5"
      />
      <span class="hidden xl:inline">ดูหน้าเว็บสมาชิก</span>
    </a>

    <UPopover
      v-model:open="isNotificationsOpen"
      :content="{ align: 'end', sideOffset: 12, collisionPadding: 16 }"
      :ui="{ content: 'rounded-2xl shadow-xl ring-default' }"
    >
      <button
        type="button"
        class="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink transition-colors hover:bg-primary-soft lg:size-11"
        :aria-label="unreadCount ? `การแจ้งเตือน ยังไม่อ่าน ${unreadCount} รายการ` : 'การแจ้งเตือน'"
      >
        <UIcon
          name="i-lucide-bell"
          class="size-5"
        />
        <span
          v-if="unreadCount"
          aria-hidden="true"
          class="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-number text-xs font-bold text-white ring-2 ring-white"
        >
          {{ unreadCount }}
        </span>
      </button>

      <template #content>
        <AdminNotificationsPanel @navigate="isNotificationsOpen = false" />
      </template>
    </UPopover>

    <UPopover
      v-if="account"
      v-model:open="isAccountMenuOpen"
      :content="{ align: 'end', sideOffset: 12, collisionPadding: 16 }"
      :ui="{ content: 'rounded-2xl shadow-xl ring-default' }"
    >
      <button
        type="button"
        class="flex shrink-0 items-center gap-3 rounded-full py-1 pl-1 transition-colors hover:bg-cream md:pr-2"
        aria-label="เมนูบัญชี"
      >
        <AdminAvatar
          :account="account"
          size="lg"
        />
        <span class="hidden max-w-40 truncate font-bold text-ink md:inline">{{ adminDisplayName(account) }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="hidden size-4 text-muted transition-transform md:block"
          :class="isAccountMenuOpen ? 'rotate-180' : undefined"
        />
      </button>

      <template #content>
        <AdminAccountMenu @navigate="isAccountMenuOpen = false" />
      </template>
    </UPopover>
  </header>
</template>
