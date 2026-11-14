<script setup lang="ts">
// Figma 20:306 (profile dropdown). The account pages have no designs yet and open the placeholder page.
const emit = defineEmits<{
  navigate: []
}>()

const { public: { memberSiteUrl } } = useRuntimeConfig()
const { account, signOut } = useAdminAuth()

const accountLinks = [
  { label: 'บัญชีของฉัน', icon: 'i-lucide-users', to: '/account' },
  { label: 'เปลี่ยนรหัสผ่าน', icon: 'i-lucide-key-round', to: '/account/password' },
  { label: 'ยืนยันตัวตน 2 ขั้นตอน', icon: 'i-lucide-shield', to: '/account/security' }
]

async function signOutFromMenu() {
  emit('navigate')
  await signOut()
}
</script>

<template>
  <div
    v-if="account"
    class="w-[min(280px,calc(100vw-2rem))] py-2"
  >
    <div class="flex items-center gap-3 px-5 pt-3 pb-4">
      <AdminAvatar
        :account="account"
        size="lg"
      />
      <div class="min-w-0">
        <p class="truncate font-bold text-ink">
          {{ adminDisplayName(account) }}
        </p>
        <p class="truncate text-[13px] text-muted">
          {{ ADMIN_ROLE_LABELS[account.role] }}
        </p>
      </div>
    </div>

    <div class="mx-4 border-t border-default" />

    <ul class="flex flex-col gap-1 px-3 py-3">
      <li
        v-for="link in accountLinks"
        :key="link.to"
      >
        <NuxtLink
          :to="link.to"
          class="flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] text-ink transition-colors hover:bg-cream"
          @click="emit('navigate')"
        >
          <UIcon
            :name="link.icon"
            class="size-5 shrink-0"
          />
          {{ link.label }}
        </NuxtLink>
      </li>
      <li>
        <a
          :href="memberSiteUrl"
          target="_blank"
          rel="noopener"
          class="flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] text-ink transition-colors hover:bg-cream"
          @click="emit('navigate')"
        >
          <UIcon
            name="i-lucide-external-link"
            class="size-5 shrink-0"
          />
          ดูหน้าเว็บสมาชิก
        </a>
      </li>
    </ul>

    <div class="mx-4 border-t border-default" />

    <div class="px-3 pt-3 pb-1">
      <button
        type="button"
        class="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-bold text-primary-dark transition-colors hover:bg-primary-soft"
        @click="signOutFromMenu"
      >
        <UIcon
          name="i-lucide-log-out"
          class="size-5 shrink-0"
        />
        ออกจากระบบ
      </button>
    </div>
  </div>
</template>
