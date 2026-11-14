<script setup lang="ts">
// Top bar search with results in a dropdown under the field (search design shared on 2026-11-14)
const { searchTerm, results, totalCount, isSearching, hasFailedGroup } = useGlobalSearch()

const searchRoot = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const isActive = ref(false)

const hasSearchTerm = computed(() => searchTerm.value.trim().length > 0)
const isPanelOpen = computed(() => isActive.value && hasSearchTerm.value)

defineShortcuts({
  // meta_k is Ctrl+K on Windows and ⌘K on macOS
  meta_k: () => searchInput.value?.focus()
})

function closePanel() {
  isActive.value = false
  searchInput.value?.blur()
}

function clearSearch() {
  searchTerm.value = ''
  searchInput.value?.focus()
}

function closeWhenFocusLeaves(event: FocusEvent) {
  const nextFocus = event.relatedTarget as Node | null
  if (!nextFocus || !searchRoot.value?.contains(nextFocus)) isActive.value = false
}

function closeOnOutsidePointer(event: PointerEvent) {
  if (!searchRoot.value?.contains(event.target as Node)) isActive.value = false
}

onMounted(() => document.addEventListener('pointerdown', closeOnOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnOutsidePointer))

async function openResult(path: string) {
  closePanel()
  searchTerm.value = ''
  await navigateTo(path)
}

async function viewAllResults() {
  const query = searchTerm.value.trim()
  if (!query) return
  closePanel()
  await navigateTo({ path: '/search', query: { q: query } })
}

function memberInitial(fullName: string) {
  return Array.from(fullName)[0] ?? '?'
}
</script>

<template>
  <div
    ref="searchRoot"
    class="relative min-w-0 flex-1 md:max-w-[520px]"
    @focusout="closeWhenFocusLeaves"
  >
    <div
      class="flex h-10 items-center gap-2 rounded-full px-4 transition-colors sm:gap-3 lg:h-12 lg:px-5"
      :class="isActive ? 'bg-white ring-[1.5px] ring-primary' : 'bg-cream hover:bg-primary-soft/60'"
    >
      <UIcon
        name="i-lucide-search"
        class="size-5 shrink-0 text-muted"
      />
      <input
        ref="searchInput"
        v-model="searchTerm"
        type="text"
        role="combobox"
        aria-label="ค้นหาสมาชิก เลขคำสั่งซื้อ หรือเบอร์โทร"
        aria-controls="global-search-results"
        :aria-expanded="isPanelOpen"
        autocomplete="off"
        placeholder="ค้นหาสมาชิก เลขคำสั่งซื้อ หรือเบอร์โทร"
        class="min-w-0 flex-1 truncate bg-transparent text-base text-ink outline-none placeholder:text-dimmed"
        @focus="isActive = true"
        @keydown.esc.prevent="closePanel"
        @keydown.enter.prevent="viewAllResults"
      >
      <button
        v-if="searchTerm"
        type="button"
        aria-label="ล้างคำค้น"
        class="flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink"
        @click="clearSearch"
      >
        <UIcon
          name="i-lucide-x"
          class="size-4"
        />
      </button>
      <kbd
        v-else
        class="hidden rounded-md border border-default bg-white px-2 py-0.5 font-sans text-xs font-bold text-muted md:inline"
      >Ctrl K</kbd>
    </div>

    <div
      v-if="isPanelOpen"
      id="global-search-results"
      class="fixed inset-x-4 top-[72px] z-40 overflow-hidden rounded-2xl bg-white shadow-xl ring ring-default md:absolute md:inset-x-auto md:top-full md:left-0 md:mt-2 md:w-[640px]"
    >
      <div class="max-h-[calc(100dvh-180px)] overflow-y-auto p-2 sm:p-3 md:max-h-[70vh]">
        <p
          v-if="isSearching && totalCount === 0"
          class="px-3 py-6 text-center text-sm text-muted"
        >
          กำลังค้นหา…
        </p>

        <p
          v-else-if="totalCount === 0"
          class="px-3 py-6 text-center text-sm text-muted"
        >
          ไม่พบผลลัพธ์สำหรับ “{{ searchTerm.trim() }}”
        </p>

        <template v-else>
          <section
            v-if="results.members.items.length"
            aria-label="สมาชิก"
          >
            <h3 class="px-3 pt-1 pb-2 font-sans text-[13px] font-bold text-muted">
              สมาชิก
            </h3>
            <NuxtLink
              v-for="member in results.members.items"
              :key="member.id"
              :to="`/members/${member.id}`"
              class="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-cream focus-visible:bg-cream focus-visible:outline-none"
              @click.prevent="openResult(`/members/${member.id}`)"
            >
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-lg text-primary-dark">
                {{ memberInitial(member.fullName || member.memberCode) }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-bold text-ink">{{ member.fullName || 'ยังไม่ได้กรอกชื่อ' }}</span>
                <span class="block truncate text-[13px] text-muted">
                  {{ member.memberCode }}<template v-if="member.phone"> · {{ formatThaiPhone(member.phone) }}</template>
                </span>
              </span>
              <span
                v-if="member.tierName"
                class="hidden shrink-0 rounded-full bg-primary-soft px-3 py-1 text-[13px] font-bold text-primary-dark sm:inline"
              >
                {{ member.tierName }}
              </span>
              <span
                v-if="member.pointsBalance !== null"
                class="hidden w-24 shrink-0 text-right text-[15px] font-bold text-ink sm:block"
              >
                {{ member.pointsBalance.toLocaleString('th-TH') }} แต้ม
              </span>
            </NuxtLink>
          </section>

          <section
            v-if="results.orders.items.length"
            aria-label="คำสั่งซื้อ"
            class="mt-2"
          >
            <h3 class="px-3 pt-1 pb-2 font-sans text-[13px] font-bold text-muted">
              คำสั่งซื้อ
            </h3>
            <NuxtLink
              v-for="order in results.orders.items"
              :key="order.id"
              :to="`/orders/${order.id}`"
              class="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-cream focus-visible:bg-cream focus-visible:outline-none"
              @click.prevent="openResult(`/orders/${order.id}`)"
            >
              <span class="flex size-10 shrink-0 items-center justify-center">
                <NuxtImg
                  :src="MARKETPLACE_LOGOS[order.platform].src"
                  :alt="MARKETPLACE_LOGOS[order.platform].name"
                  width="28"
                  height="28"
                  class="size-7 rounded-md"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-number text-base font-bold text-ink">{{ order.orderNo }}</span>
                <span class="block truncate text-[13px] text-muted">
                  {{ order.memberName }} · ส่งเมื่อ {{ formatThaiDayMonth(order.submittedAt) }}
                </span>
              </span>
              <span
                class="shrink-0 rounded-full px-3 py-1 text-[13px] font-bold"
                :class="ORDER_STATUS_BADGES[order.status].class"
              >
                {{ ORDER_STATUS_BADGES[order.status].label }}
              </span>
            </NuxtLink>
          </section>

          <section
            v-if="results.redemptions.items.length"
            aria-label="การแลกของรางวัล"
            class="mt-2"
          >
            <h3 class="px-3 pt-1 pb-2 font-sans text-[13px] font-bold text-muted">
              การแลกของรางวัล
            </h3>
            <NuxtLink
              v-for="redemption in results.redemptions.items"
              :key="redemption.id"
              :to="`/redemptions/${redemption.id}`"
              class="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-cream focus-visible:bg-cream focus-visible:outline-none"
              @click.prevent="openResult(`/redemptions/${redemption.id}`)"
            >
              <span class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cream">
                <NuxtImg
                  v-if="redemption.rewardImageUrl"
                  :src="redemption.rewardImageUrl"
                  alt=""
                  width="40"
                  height="40"
                  class="size-10 object-cover"
                />
                <UIcon
                  v-else
                  name="i-lucide-gift"
                  class="size-5 text-muted"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-bold text-ink">{{ redemption.redemptionNo }} · {{ redemption.rewardName }}</span>
                <span class="block truncate text-[13px] text-muted">
                  {{ redemption.memberName }}<template v-if="redemption.carrierName"> · {{ redemption.carrierName }} {{ redemption.trackingNo }}</template>
                </span>
              </span>
              <span
                class="shrink-0 rounded-full px-3 py-1 text-[13px] font-bold"
                :class="REDEMPTION_STATUS_BADGES[redemption.status].class"
              >
                {{ REDEMPTION_STATUS_BADGES[redemption.status].label }}
              </span>
            </NuxtLink>
          </section>
        </template>

        <p
          v-if="hasFailedGroup"
          class="mx-3 mt-2 rounded-lg bg-primary-soft px-3 py-2 text-[13px] text-primary-dark"
        >
          ค้นหาบางส่วนไม่สำเร็จ ผลลัพธ์อาจไม่ครบ
        </p>
      </div>

      <div class="flex items-center justify-between gap-3 border-t border-default px-4 py-3 sm:px-5 sm:py-4">
        <p class="hidden text-xs text-muted md:block">
          กด Enter เพื่อดูผลทั้งหมด · Esc เพื่อปิด
        </p>
        <button
          v-if="totalCount > 0"
          type="button"
          class="ml-auto text-[13px] font-bold text-primary-dark hover:underline"
          @click="viewAllResults"
        >
          ดูผลทั้งหมด {{ totalCount.toLocaleString('th-TH') }} รายการ ›
        </button>
      </div>
    </div>
  </div>
</template>
