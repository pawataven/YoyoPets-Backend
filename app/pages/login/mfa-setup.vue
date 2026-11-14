<script setup lang="ts">
import type { TotpCodeDigits, TotpEnrollment } from '~/types/admin'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'ตั้งค่ายืนยันตัวตน · YoyoPet Admin' })

const route = useRoute()
const toast = useToast()
const { account, startTotpEnrollment, verifyTotp, signOut } = useAdminAuth()

// Kept across remounts within the app: every enrolment issues a new secret, which silently
// invalidates whatever the admin already scanned. A full page reload still has to start over.
const enrollment = useState<TotpEnrollment | null>('totp-enrollment', () => null)
const enrollmentError = ref<string | null>(null)
const isLoadingEnrollment = ref(false)
const totpCode = ref<TotpCodeDigits>([])
const isVerifying = ref(false)
const errorMessage = ref<string | null>(null)
const isCodeComplete = computed(() => totpCode.value.join('').length === 6)

async function createEnrollment() {
  isLoadingEnrollment.value = true
  enrollmentError.value = null
  errorMessage.value = null
  totpCode.value = []
  enrollment.value = null
  try {
    enrollment.value = await startTotpEnrollment()
  } catch (error) {
    enrollmentError.value = describeAuthError(error)
  } finally {
    isLoadingEnrollment.value = false
  }
}

onMounted(() => {
  if (!enrollment.value) createEnrollment()
})

async function copySecret() {
  if (!enrollment.value) return
  try {
    await navigator.clipboard.writeText(enrollment.value.secret)
    toast.add({ title: 'คัดลอกรหัสตั้งค่าแล้ว', color: 'success', icon: 'i-lucide-check' })
  } catch {
    toast.add({ title: 'คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกเอง', color: 'error' })
  }
}

async function submitTotpCode() {
  if (!enrollment.value || !isCodeComplete.value || isVerifying.value) return
  isVerifying.value = true
  errorMessage.value = null
  try {
    await verifyTotp(totpCode.value.join(''), enrollment.value.factorId)
    enrollment.value = null
    toast.add({ title: 'ตั้งค่ายืนยันตัวตน 2 ขั้นตอนเรียบร้อย', color: 'success', icon: 'i-lucide-shield-check' })
    await navigateTo(safeRedirectPath(route.query.redirect))
  } catch (error) {
    errorMessage.value = describeAuthError(error)
    totpCode.value = []
  } finally {
    isVerifying.value = false
  }
}
</script>

<template>
  <div>
    <AuthPageHeader
      title="ตั้งค่ายืนยันตัวตน"
      description="ทำครั้งเดียว หลังจากนี้ทุกครั้งที่เข้าสู่ระบบต้องกรอกรหัสจากแอปด้วย"
    />

    <ol class="flex flex-col gap-6 text-[15px] text-ink">
      <li>
        <p class="font-bold">
          1. ติดตั้งแอป Authenticator
        </p>
        <p class="mt-1 text-muted">
          เช่น Google Authenticator หรือ Microsoft Authenticator บนโทรศัพท์ของคุณ
        </p>
      </li>

      <li>
        <p class="font-bold">
          2. สแกน QR code นี้ด้วยแอป
        </p>

        <div class="mt-3 flex flex-col items-center gap-5 rounded-xl bg-cream p-4 sm:flex-row sm:gap-6 sm:p-5">
          <div class="flex size-44 shrink-0 items-center justify-center rounded-lg bg-white">
            <img
              v-if="enrollment"
              :src="enrollment.qrCode"
              alt="QR code สำหรับตั้งค่าแอป Authenticator"
              width="160"
              height="160"
            >
            <UIcon
              v-else-if="!enrollmentError"
              name="i-lucide-loader-circle"
              class="size-8 animate-spin text-muted"
            />
          </div>

          <div
            v-if="enrollment"
            class="min-w-0"
          >
            <p class="text-sm text-muted">
              สแกนไม่ได้? กรอกรหัสนี้ในแอปแทน
            </p>
            <p class="mt-2 font-mono text-sm break-all text-ink">
              {{ enrollment.secret }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-copy"
                @click="copySecret"
              >
                คัดลอก
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-refresh-cw"
                :loading="isLoadingEnrollment"
                @click="createEnrollment"
              >
                สร้าง QR ใหม่
              </UButton>
            </div>
          </div>
        </div>

        <p class="mt-3 text-sm text-muted">
          ในแอปจะแสดงชื่อ "YoyoPet Admin" · ถ้าโหลดหน้านี้ใหม่หรือกดสร้าง QR ใหม่ QR เดิมจะใช้ไม่ได้
          ให้ลบรายการเก่าในแอปแล้วสแกนใหม่
        </p>

        <UAlert
          v-if="enrollmentError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="enrollmentError"
          class="mt-3"
          :actions="[{ label: 'ลองใหม่', color: 'error', variant: 'outline', onClick: createEnrollment }]"
        />
      </li>

      <li>
        <p class="mb-3 font-bold">
          3. กรอกรหัสที่แอปแสดง
        </p>
        <form @submit.prevent="submitTotpCode">
          <AuthTotpCodeField
            v-model="totpCode"
            label="รหัส 6 หลักจากแอป"
            :disabled="!enrollment || isVerifying"
            @complete="submitTotpCode"
          />

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
            class="mt-6"
          />

          <UButton
            type="submit"
            block
            :loading="isVerifying"
            :disabled="!enrollment || !isCodeComplete"
            class="mt-8 h-14 rounded-xl font-heading text-lg font-normal"
          >
            ยืนยันและเข้าสู่ระบบ
          </UButton>
        </form>
      </li>
    </ol>

    <p class="mt-8 text-center text-[15px] text-muted">
      <template v-if="account">
        เข้าสู่ระบบในชื่อ {{ account.email }} ·
      </template>
      <button
        type="button"
        class="font-bold text-primary-dark hover:underline"
        @click="signOut()"
      >
        ใช้บัญชีอื่น
      </button>
    </p>
  </div>
</template>
