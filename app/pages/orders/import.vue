<script setup lang="ts">
// No Figma frame yet: designed to match /orders (user, 2026-11-18). Flow and rules:
// docs/superpowers/specs/2026-11-18-order-file-import-design.md
useSeoMeta({ title: 'นำเข้าไฟล์จาก Seller Center · YoyoPet Admin' })

const {
  platform,
  step,
  errorMessage,
  fileName,
  headerRow,
  dataRows,
  detection,
  grouped,
  progress,
  summary,
  longWaitingCount,
  longWaitDays,
  selectFile,
  confirmColumns,
  confirmStatuses,
  runImport,
  reset,
  refreshLongWaitingCount
} = useOrderImport()

onMounted(refreshLongWaitingCount)

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const isDragging = ref(false)

const isBusy = computed(() => step.value === 'reading' || step.value === 'importing')

function pickFile(files: FileList | null | undefined) {
  const file = files?.[0]
  if (file && !isBusy.value) selectFile(file)
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  pickFile(input.files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  pickFile(event.dataTransfer?.files)
}

// Leaving mid-import is safe (chunks are idempotent and the same file resumes), but the admin should know
function warnBeforeLeavingImport(event: BeforeUnloadEvent) {
  if (step.value === 'importing') event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', warnBeforeLeavingImport))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeLeavingImport))
</script>

<template>
  <div>
    <AdminPageHeader
      :breadcrumbs="[{ label: 'หน้าแรก', to: '/' }, { label: 'ตรวจเลขออเดอร์', to: '/orders' }, { label: 'นำเข้าไฟล์' }]"
      title="นำเข้าไฟล์จาก Seller Center"
      description="ระบบใช้ไฟล์นี้จับคู่เลขคำสั่งซื้อที่สมาชิกส่งมา และตัดสินว่าแต้มที่อนุมัติแล้วจะเข้าเมื่อไร หรือถูกยกเลิกเพราะคืนสินค้า"
    />

    <UAlert
      v-if="longWaitingCount"
      color="warning"
      variant="subtle"
      icon="i-lucide-clock-alert"
      :title="`แต้ม ${longWaitingCount.toLocaleString('th-TH')} รายการรอข้อมูลส่งถึงนานกว่า ${longWaitDays} วัน`"
      description="ออเดอร์เหล่านี้อนุมัติแล้วแต่ยังไม่เจอวันส่งถึงในไฟล์ใดเลย ลองนำเข้าไฟล์ที่ครอบคลุมช่วงวันที่สั่งซื้อของออเดอร์เหล่านั้น"
      :actions="[{ label: 'ดูรายการ', to: { path: '/orders', query: { tab: 'waiting_return_period', within: 'all' } }, color: 'neutral', variant: 'outline' }]"
      class="mt-6"
    />

    <section class="mt-6 rounded-2xl border-[1.5px] border-default bg-white p-6 sm:mt-8">
      <h2 class="text-lg font-bold text-ink">
        1. เลือกช่องทาง
      </h2>
      <div
        class="mt-4 grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="ช่องทาง"
      >
        <button
          v-for="option in IMPORT_PLATFORM_OPTIONS"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="platform === option.value"
          :disabled="!option.isReady || isBusy"
          class="flex h-16 items-center gap-3 rounded-xl px-4 text-left ring-[1.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :class="platform === option.value ? 'bg-primary-soft ring-primary' : 'bg-white ring-accented hover:bg-cream'"
          @click="platform = option.value"
        >
          <NuxtImg
            :src="MARKETPLACE_LOGOS[option.value].src"
            alt=""
            width="32"
            height="32"
            class="size-8 shrink-0"
          />
          <span class="font-bold text-ink">{{ option.label }}</span>
          <span
            v-if="!option.isReady"
            class="ms-auto text-[13px] text-muted"
          >เร็ว ๆ นี้</span>
        </button>
      </div>

      <h2 class="mt-8 text-lg font-bold text-ink">
        2. วางไฟล์
      </h2>
      <p class="mt-1 text-sm text-muted">
        ใช้ไฟล์ .csv หรือ .xlsx ที่ export จาก Seller Center ได้เลย ไม่ต้องเปิดแก้ใน Excel
        นำเข้าทุกวัน และไฟล์ที่ช่วงวันที่ซ้อนกันนำเข้าซ้ำได้ ระบบจะอัปเดตสถานะล่าสุดให้เอง
      </p>
      <div
        class="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors"
        :class="isDragging ? 'border-primary bg-primary-soft' : 'border-accented bg-cream/40'"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <UIcon
          :name="step === 'reading' ? 'i-lucide-loader-circle' : 'i-lucide-file-spreadsheet'"
          class="size-10 text-primary"
          :class="{ 'animate-spin': step === 'reading' }"
        />
        <p class="text-[15px] text-ink">
          <template v-if="step === 'reading'">
            กำลังอ่าน {{ fileName }}…
          </template>
          <template v-else-if="fileName && step !== 'choose'">
            {{ fileName }}
          </template>
          <template v-else>
            ลากไฟล์มาวางที่นี่ หรือ
          </template>
        </p>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-folder-open"
          class="h-10 rounded-xl bg-white px-4 font-heading font-normal text-ink ring-[1.5px]"
          :disabled="isBusy"
          @click="fileInput?.click()"
        >
          {{ fileName && step !== 'choose' ? 'เลือกไฟล์อื่น' : 'เลือกไฟล์' }}
        </UButton>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="sr-only"
          aria-label="เลือกไฟล์คำสั่งซื้อ"
          @change="onFileInputChange"
        >
      </div>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errorMessage"
        class="mt-4"
      />
    </section>

    <OrderImportColumnMapper
      v-if="step === 'map_columns' && detection"
      :header-row="headerRow"
      :data-rows="dataRows.slice(0, 20)"
      :missing-fields="detection.missingFields"
      :is-delivered-date-missing="detection.columnByField.delivered_at === undefined"
      class="mt-6"
      @confirm="confirmColumns"
    />

    <OrderImportStatusMapper
      v-else-if="step === 'map_statuses' && grouped"
      :unknown-statuses="grouped.unknownStatuses"
      class="mt-6"
      @confirm="confirmStatuses"
    />

    <OrderImportReview
      v-else-if="(step === 'review' || step === 'importing') && grouped"
      :grouped="grouped"
      :file-name="fileName"
      :is-importing="step === 'importing'"
      :progress="progress"
      class="mt-6"
      @import="runImport"
      @cancel="reset"
    />

    <OrderImportResult
      v-else-if="step === 'done' && summary"
      :summary="summary"
      class="mt-6"
      @again="reset"
    />
  </div>
</template>
