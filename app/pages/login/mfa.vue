<script setup lang="ts">
// Figma node 20:62. Its "remember this device for 30 days" checkbox is left out (every sign-in needs TOTP),
// and "lost phone" points to a super admin reset instead of recovery codes (both agreed 2026-11-14)
import { DialogDescription, DialogTitle } from 'reka-ui'
import type { TotpCodeDigits } from '~/types/admin'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'ยืนยันตัวตน 2 ขั้นตอน · YoyoPet Admin' })

const route = useRoute()
const { verifyTotp, signOut } = useAdminAuth()

const totpCode = ref<TotpCodeDigits>([])
const isVerifying = ref(false)
const errorMessage = ref<string | null>(null)
const isLostPhoneHelpVisible = ref(false)
const isCodeComplete = computed(() => totpCode.value.join('').length === 6)

async function submitTotpCode() {
  if (!isCodeComplete.value || isVerifying.value) return
  isVerifying.value = true
  errorMessage.value = null
  try {
    await verifyTotp(totpCode.value.join(''))
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
    <!-- The design shows the sign-in form dimmed behind the dialog; inert keeps it out of focus and clicks -->
    <div
      inert
      aria-hidden="true"
    >
      <AuthLoginForm />
    </div>

    <UModal
      :open="true"
      :dismissible="false"
      :close="false"
      :ui="{
        overlay: 'bg-black/45',
        content: 'max-w-[580px] rounded-3xl px-5 pt-5 pb-7 ring-0 divide-y-0 sm:px-12 sm:pt-6 sm:pb-8'
      }"
    >
      <template #content>
        <div class="flex flex-col items-center">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-x"
            aria-label="ยกเลิกและกลับไปหน้าเข้าสู่ระบบ"
            class="size-9 self-end justify-center rounded-full bg-cream text-ink hover:bg-primary-soft"
            @click="signOut()"
          />

          <span class="flex size-16 items-center justify-center rounded-full bg-primary-soft sm:size-[72px]">
            <UIcon
              name="i-lucide-shield"
              class="size-7 text-primary-dark"
            />
          </span>

          <!-- DialogTitle renders an <h2>, which the base layer sets to Mitr; Figma 20:62 uses Anuphan here -->
          <DialogTitle class="mt-5 text-center font-sans text-[22px] font-bold text-ink sm:text-[26px]">
            ยืนยันตัวตน 2 ขั้นตอน
          </DialogTitle>
          <DialogDescription class="mt-2 text-center text-sm text-muted sm:text-base">
            กรอกรหัส 6 หลักจากแอป Google Authenticator
          </DialogDescription>

          <form
            class="mt-8 flex w-full flex-col"
            @submit.prevent="submitTotpCode"
          >
            <AuthTotpCodeField
              v-model="totpCode"
              :disabled="isVerifying"
              class="self-center"
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
              :disabled="!isCodeComplete"
              class="mt-8 h-[52px] rounded-xl font-heading text-lg font-normal"
            >
              ยืนยัน
            </UButton>
          </form>

          <button
            type="button"
            class="mt-7 text-[15px] font-bold text-primary-dark hover:underline"
            :aria-expanded="isLostPhoneHelpVisible"
            @click="isLostPhoneHelpVisible = !isLostPhoneHelpVisible"
          >
            ทำโทรศัพท์หาย?
          </button>
          <p
            v-if="isLostPhoneHelpVisible"
            class="mt-3 rounded-xl bg-cream px-5 py-4 text-center text-sm text-ink"
          >
            ติดต่อเจ้าของร้าน (ผู้ดูแลระบบสูงสุด) เพื่อรีเซ็ตการยืนยันตัวตน
            แล้วเข้าสู่ระบบใหม่เพื่อตั้งค่ากับโทรศัพท์เครื่องใหม่
          </p>
        </div>
      </template>
    </UModal>
  </div>
</template>
