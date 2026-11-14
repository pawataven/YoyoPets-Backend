<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'ตั้งรหัสผ่านใหม่ · YoyoPet Admin' })

const MIN_PASSWORD_LENGTH = 8

const route = useRoute()
const toast = useToast()
const { startPasswordRecovery, updatePassword, signOut } = useAdminAuth()

const passwordForm = reactive({ password: '', confirmPassword: '' })
const isCheckingLink = ref(true)
const linkErrorMessage = ref<string | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  try {
    const code = typeof route.query.code === 'string' ? route.query.code : null
    const step = await startPasswordRecovery(code)
    // With TOTP enrolled, Supabase only lets an aal2 session change the password
    if (step !== 'ready') {
      await navigateTo({ path: ADMIN_AUTH_STEP_PATHS[step], query: { redirect: '/reset-password' } })
      return
    }
  } catch (error) {
    linkErrorMessage.value = describeAuthError(error)
  } finally {
    isCheckingLink.value = false
  }
})

function validatePasswordForm(state: typeof passwordForm): FormError[] {
  const errors: FormError[] = []
  if (state.password.length < MIN_PASSWORD_LENGTH) {
    errors.push({ name: 'password', message: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร` })
  }
  if (state.confirmPassword !== state.password) {
    errors.push({ name: 'confirmPassword', message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' })
  }
  return errors
}

async function submitNewPassword() {
  isSubmitting.value = true
  errorMessage.value = null
  try {
    await updatePassword(passwordForm.password)
    toast.add({ title: 'ตั้งรหัสผ่านใหม่เรียบร้อย', color: 'success', icon: 'i-lucide-check' })
    await navigateTo('/')
  } catch (error) {
    errorMessage.value = describeAuthError(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <AuthPageHeader
      title="ตั้งรหัสผ่านใหม่"
      description="ตั้งรหัสผ่านใหม่สำหรับเข้าระบบหลังบ้าน"
    />

    <div
      v-if="isCheckingLink"
      class="flex justify-center py-8"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <template v-else-if="linkErrorMessage">
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-link-2-off"
        :title="linkErrorMessage"
      />
      <UButton
        to="/forgot-password"
        block
        class="mt-8 h-14 rounded-xl font-heading text-lg font-normal"
      >
        ขอลิงก์ใหม่
      </UButton>
    </template>

    <UForm
      v-else
      :state="passwordForm"
      :validate="validatePasswordForm"
      :validate-on="['blur']"
      class="flex flex-col"
      @submit="submitNewPassword"
    >
      <UFormField
        label="รหัสผ่านใหม่"
        name="password"
        :hint="`อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`"
        :ui="{ label: 'text-[15px] font-bold text-ink' }"
      >
        <UInput
          v-model="passwordForm.password"
          type="password"
          autocomplete="new-password"
          class="mt-1 w-full"
          :ui="{ base: 'h-12 rounded-xl px-4 text-base ring-[1.5px]' }"
        />
      </UFormField>

      <UFormField
        label="ยืนยันรหัสผ่านใหม่"
        name="confirmPassword"
        class="mt-6"
        :ui="{ label: 'text-[15px] font-bold text-ink' }"
      >
        <UInput
          v-model="passwordForm.confirmPassword"
          type="password"
          autocomplete="new-password"
          class="mt-1 w-full"
          :ui="{ base: 'h-12 rounded-xl px-4 text-base ring-[1.5px]' }"
        />
      </UFormField>

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
        :loading="isSubmitting"
        class="mt-8 h-14 rounded-xl font-heading text-lg font-normal"
      >
        บันทึกรหัสผ่านใหม่
      </UButton>

      <p class="mt-8 text-center text-[15px]">
        <button
          type="button"
          class="font-bold text-primary-dark hover:underline"
          @click="signOut()"
        >
          ยกเลิกและออกจากระบบ
        </button>
      </p>
    </UForm>
  </div>
</template>
