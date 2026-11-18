<script setup lang="ts">
import type { ImportSummary } from '~/types/order-import'

const props = defineProps<{
  summary: ImportSummary
}>()

const emit = defineEmits<{
  again: []
}>()

const pointChanges = computed(() => [
  { label: 'ตั้งวันแต้มเข้า', count: props.summary.pointsScheduled, tone: 'text-ink' },
  { label: 'แต้มเข้าแล้ว', count: props.summary.pointsReleased, tone: 'text-success' },
  { label: 'ลดแต้ม (คืนบางชิ้น)', count: props.summary.pointsReduced, tone: 'text-pending' },
  { label: 'ยกเลิกแต้ม (คืน/ยกเลิก)', count: props.summary.pointsCancelled, tone: 'text-primary-dark' }
])
</script>

<template>
  <section class="rounded-2xl border-[1.5px] border-default bg-white p-6">
    <div class="flex items-center gap-3">
      <UIcon
        name="i-lucide-circle-check"
        class="size-7 text-success"
      />
      <h2 class="text-lg font-bold text-ink">
        นำเข้าเสร็จแล้ว {{ summary.ordersTotal.toLocaleString('th-TH') }} ออเดอร์
      </h2>
    </div>

    <dl class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="change in pointChanges"
        :key="change.label"
        class="rounded-xl bg-cream p-4"
      >
        <dt class="text-sm text-muted">
          {{ change.label }}
        </dt>
        <dd
          class="mt-1 font-number text-2xl font-bold"
          :class="change.tone"
        >
          {{ change.count.toLocaleString('th-TH') }}
        </dd>
      </div>
    </dl>

    <div
      v-if="summary.warningMemberOrderIds.length"
      class="mt-5 rounded-xl bg-primary-soft p-4 text-sm text-primary-dark"
      role="alert"
    >
      <p class="font-bold">
        {{ summary.warningMemberOrderIds.length.toLocaleString('th-TH') }} ออเดอร์ให้แต้มใช้ได้ไปแล้ว แต่ไฟล์บอกว่าคืนสินค้าหรือยกเลิก
      </p>
      <p class="mt-1">
        ระบบไม่ดึงแต้มคืนเอง เพราะสมาชิกอาจใช้ไปแล้ว ตรวจและตัดสินใจทีละรายการ
      </p>
      <ul class="mt-2 flex flex-wrap gap-2">
        <li
          v-for="orderId in summary.warningMemberOrderIds"
          :key="orderId"
        >
          <NuxtLink
            :to="`/orders/${orderId}`"
            class="font-bold underline"
          >
            เปิดรายการ
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div class="mt-6 flex flex-wrap gap-3">
      <UButton
        v-if="summary.memberOrdersPendingMatched"
        :to="{ path: '/orders', query: { match: 'matched' } }"
        icon="i-lucide-list-checks"
        class="h-11 rounded-xl px-6 font-heading text-base font-normal"
      >
        ตรวจ {{ summary.memberOrdersPendingMatched.toLocaleString('th-TH') }} ออเดอร์ที่รอตรวจและเจอในไฟล์
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        class="h-11 rounded-xl bg-white px-6 font-heading text-base font-normal text-ink ring-[1.5px]"
        @click="emit('again')"
      >
        นำเข้าไฟล์อื่น
      </UButton>
    </div>
  </section>
</template>
