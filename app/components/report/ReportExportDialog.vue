<script setup lang="ts">
import { DialogDescription, DialogTitle } from 'reka-ui'
import type { ReportDefinition, ReportFileFormat, ReportKind } from '~/utils/report-types'

// Export dialog design (shared as images, 2026-11-14). Files are built in the browser from data the
// signed-in admin can read, so RLS decides what ends up in the file.
const isOpen = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  // Pre-fills the dates, e.g. with the dashboard's selected period
  initialFrom: Date
  initialTo: Date
  // e.g. the order review page opens it on "คำสั่งซื้อที่อนุมัติ"
  initialKind?: ReportKind
}>()

const toast = useToast()
const { dataSource, exportReport } = useReportExport()

const FILE_FORMATS: { value: ReportFileFormat, label: string }[] = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV' }
]

const selectedKind = ref<ReportKind>('member-summary')
const firstDay = ref(new Date())
const lastDay = ref(new Date())
const fileFormat = ref<ReportFileFormat>('xlsx')
const isExporting = ref(false)
const errorMessage = ref<string | null>(null)
const today = new Date()

watch(isOpen, (open) => {
  if (!open) return
  firstDay.value = props.initialFrom
  // initialTo is exclusive; the "ถึง" field shows the last included day, never later than today
  const lastIncludedDay = addDays(props.initialTo, -1)
  lastDay.value = lastIncludedDay > today ? today : lastIncludedDay
  errorMessage.value = null
  if (props.initialKind) selectedKind.value = props.initialKind
  if (dataSource(selectedKind.value) === 'unavailable') selectedKind.value = 'member-summary'
}, { immediate: true })

const selectedDefinition = computed(() => REPORT_DEFINITIONS.find(definition => definition.kind === selectedKind.value)!)
const rangeError = computed(() => (firstDay.value > lastDay.value ? 'วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด' : null))

async function downloadReport() {
  if (rangeError.value || isExporting.value) return
  isExporting.value = true
  errorMessage.value = null
  try {
    const { rowCount } = await exportReport(
      selectedDefinition.value,
      { from: firstDay.value, to: addDays(lastDay.value, 1) },
      fileFormat.value
    )
    toast.add({ title: `ดาวน์โหลด${selectedDefinition.value.title}แล้ว`, description: `${rowCount.toLocaleString('th-TH')} แถว`, color: 'success', icon: 'i-lucide-check' })
    isOpen.value = false
  } catch {
    errorMessage.value = 'สร้างรายงานไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    isExporting.value = false
  }
}

function sourceBadge(definition: ReportDefinition) {
  const source = dataSource(definition.kind)
  if (source === 'sample') return { label: 'ข้อมูลตัวอย่าง', class: 'bg-gold-soft text-pending' }
  if (source === 'unavailable') return { label: 'ยังไม่มีข้อมูล', class: 'bg-neutral-soft text-muted' }
  return null
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{
      overlay: 'bg-black/45',
      content: 'max-w-[720px] rounded-3xl ring-0 divide-y-0'
    }"
  >
    <template #content>
      <form
        class="flex max-h-[calc(100dvh-2rem)] flex-col"
        @submit.prevent="downloadReport"
      >
        <div class="overflow-y-auto px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <!-- DialogTitle renders an <h2>; the design uses Anuphan, not the heading font -->
              <DialogTitle class="font-sans text-2xl font-bold text-ink sm:text-[28px]">
                ส่งออกรายงาน
              </DialogTitle>
              <DialogDescription class="mt-1 text-[15px] text-muted sm:text-base">
                ข้อมูลจะดึงตามสิทธิ์ของผู้ใช้งาน
              </DialogDescription>
            </div>
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-x"
              aria-label="ปิด"
              class="size-9 shrink-0 justify-center rounded-full bg-neutral-soft text-ink hover:bg-primary-soft"
              @click="isOpen = false"
            />
          </div>

          <fieldset class="mt-7">
            <legend class="font-bold text-ink">
              ประเภทรายงาน
            </legend>
            <div class="mt-3 flex flex-col gap-2">
              <label
                v-for="definition in REPORT_DEFINITIONS"
                :key="definition.kind"
                class="flex items-center gap-3 rounded-xl px-4 py-3 ring-[1.5px] ring-inset transition-colors"
                :class="[
                  selectedKind === definition.kind ? 'bg-cream ring-primary' : 'bg-white ring-default',
                  dataSource(definition.kind) === 'unavailable' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-cream'
                ]"
              >
                <input
                  v-model="selectedKind"
                  type="radio"
                  name="report-kind"
                  :value="definition.kind"
                  :disabled="dataSource(definition.kind) === 'unavailable'"
                  class="peer sr-only"
                >
                <span
                  aria-hidden="true"
                  class="flex size-[22px] shrink-0 items-center justify-center rounded-full ring-2 ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                  :class="selectedKind === definition.kind ? 'ring-primary' : 'ring-accented'"
                >
                  <span
                    v-if="selectedKind === definition.kind"
                    class="size-2.5 rounded-full bg-primary"
                  />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-ink">{{ definition.title }}</span>
                    <span
                      v-if="sourceBadge(definition)"
                      class="rounded-full px-2 py-0.5 text-xs font-bold"
                      :class="sourceBadge(definition)!.class"
                    >{{ sourceBadge(definition)!.label }}</span>
                  </span>
                  <span class="mt-0.5 block text-sm text-muted">{{ definition.description }}</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p class="mb-2 font-bold text-ink">
                ตั้งแต่
              </p>
              <AdminDateField
                v-model="firstDay"
                label="ตั้งแต่"
                :max="today"
              />
            </div>
            <div>
              <p class="mb-2 font-bold text-ink">
                ถึง
              </p>
              <AdminDateField
                v-model="lastDay"
                label="ถึง"
                :min="firstDay"
                :max="today"
              />
            </div>
          </div>
          <p
            v-if="rangeError"
            class="mt-2 text-sm text-primary-dark"
            role="alert"
          >
            {{ rangeError }}
          </p>

          <fieldset class="mt-6 flex flex-wrap items-center gap-x-10 gap-y-3">
            <legend class="float-left mr-10 font-bold text-ink sm:mr-16">
              รูปแบบไฟล์
            </legend>
            <label
              v-for="format in FILE_FORMATS"
              :key="format.value"
              class="flex cursor-pointer items-center gap-3"
            >
              <input
                v-model="fileFormat"
                type="radio"
                name="report-format"
                :value="format.value"
                class="peer sr-only"
              >
              <span
                aria-hidden="true"
                class="flex size-[22px] items-center justify-center rounded-full ring-2 ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                :class="fileFormat === format.value ? 'ring-primary' : 'ring-accented'"
              >
                <span
                  v-if="fileFormat === format.value"
                  class="size-2.5 rounded-full bg-primary"
                />
              </span>
              <span :class="fileFormat === format.value ? 'font-bold text-ink' : 'text-ink'">{{ format.label }}</span>
            </label>
          </fieldset>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
            class="mt-5"
          />
        </div>

        <div class="flex flex-col-reverse gap-3 border-t border-default px-5 py-4 sm:flex-row sm:items-center sm:px-8 sm:py-5">
          <p class="text-sm text-muted sm:mr-auto">
            การส่งออกถูกบันทึกในบันทึกกิจกรรม
          </p>
          <div class="flex gap-3">
            <UButton
              color="neutral"
              variant="outline"
              class="h-12 flex-1 justify-center rounded-xl px-7 text-[17px] font-bold text-ink ring-[1.5px] sm:flex-none"
              @click="isOpen = false"
            >
              ยกเลิก
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-download"
              :loading="isExporting"
              :disabled="Boolean(rangeError)"
              class="h-12 flex-1 justify-center rounded-xl px-7 text-[17px] font-bold sm:flex-none"
            >
              ดาวน์โหลด
            </UButton>
          </div>
        </div>
      </form>
    </template>
  </UModal>
</template>
