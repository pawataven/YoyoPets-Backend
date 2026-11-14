<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'ลืมรหัสผ่าน · YoyoPet Admin' })

const { requestPasswordReset } = useAdminAuth()

const resetForm = reactive({ email: '' })
const isSubmitting = ref(false)
const hasSentLink = ref(false)
const errorMessage = ref<string | null>(null)

onMounted(() => {
  resetForm.email = readRememberedEmail() ?? ''
})

function validateResetForm(state: typeof resetForm): FormError[] {
  const email = state.email.trim()
  if (!email) return [{ name: 'email', message: 'กรุณากรอกอีเมล' }]
  if (!/^\S+@\S+\.\S+$/.test(email)) return [{ name: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }]
  return []
}

async function submitResetRequest() {
  isSubmitting.value = true
  errorMessage.value = null
  try {
    await requestPasswordReset(resetForm.email.trim())
    hasSentLink.value = true
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
      title="ลืมรหัสผ่าน"
      description="กรอกอีเมลที่ใช้เข้าระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้"
    />

    <!-- Same message whether or not the account exists, so the form can't be used to discover staff emails -->
    <UAlert
      v-if="hasSentLink"
      color="success"
      variant="subtle"
      icon="i-lucide-mail-check"
      title="ถ้ามีบัญชีนี้ในระบบ เราได้ส่งลิงก์ไปที่อีเมลแล้ว"
      description="เปิดลิงก์ในเบราว์เซอร์เดียวกับที่ใช้ขอลิงก์นี้ และลิงก์ใช้ได้ครั้งเดียว"
    />

    <UForm
      v-else
      :state="resetForm"
      :validate="validateResetForm"
      :validate-on="['blur']"
      class="flex flex-col"
      @submit="submitResetRequest"
    >
      <UFormField
        label="อีเมล"
        name="email"
        :ui="{ label: 'text-[15px] font-bold text-ink' }"
      >
        <UInput
          v-model="resetForm.email"
          type="email"
          autocomplete="username"
          placeholder="admin@yoyopet"
          trailing-icon="i-lucide-mail"
          class="mt-1 w-full"
          :ui="{ base: 'h-12 rounded-xl px-4 text-base ring-[1.5px]', trailingIcon: 'text-muted' }"
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
        ส่งลิงก์ตั้งรหัสผ่านใหม่
      </UButton>
    </UForm>

    <p class="mt-8 text-center text-[15px]">
      <ULink
        to="/login"
        class="font-bold text-primary-dark hover:underline"
      >
        กลับไปหน้าเข้าสู่ระบบ
      </ULink>
    </p>
  </div>
</template>
