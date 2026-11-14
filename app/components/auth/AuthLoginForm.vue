<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const route = useRoute()
const { signIn } = useAdminAuth()

const loginForm = reactive({ email: '', password: '' })
const shouldRememberEmail = ref(false)
const isPasswordVisible = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const SIGNED_OUT_REASON_MESSAGES: Record<string, string> = {
  idle: 'ออกจากระบบอัตโนมัติ เพราะไม่ได้ใช้งานเกิน 30 นาที',
  not_admin: 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้ระบบหลังบ้าน กรุณาติดต่อเจ้าของร้าน'
}
const signedOutMessage = computed(() => {
  const reason = route.query.reason
  return typeof reason === 'string' ? SIGNED_OUT_REASON_MESSAGES[reason] ?? null : null
})

onMounted(() => {
  const rememberedEmail = readRememberedEmail()
  if (rememberedEmail) {
    loginForm.email = rememberedEmail
    shouldRememberEmail.value = true
  }
})

function validateLoginForm(state: typeof loginForm): FormError[] {
  const errors: FormError[] = []
  if (!state.email.trim()) errors.push({ name: 'email', message: 'กรุณากรอกอีเมล' })
  else if (!/^\S+@\S+\.\S+$/.test(state.email.trim())) errors.push({ name: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  if (!state.password) errors.push({ name: 'password', message: 'กรุณากรอกรหัสผ่าน' })
  return errors
}

async function submitLogin() {
  isSubmitting.value = true
  errorMessage.value = null
  const email = loginForm.email.trim()
  try {
    const step = await signIn(email, loginForm.password)
    saveRememberedEmail(shouldRememberEmail.value ? email : null)
    const redirect = safeRedirectPath(route.query.redirect)
    if (step === 'ready') await navigateTo(redirect)
    else await navigateTo({ path: ADMIN_AUTH_STEP_PATHS[step], query: { redirect } })
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
      title="เข้าสู่ระบบ"
      description="สำหรับผู้ดูแลระบบและทีมงานเท่านั้น"
    />

    <UAlert
      v-if="signedOutMessage && !errorMessage"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="signedOutMessage"
      class="mb-6"
    />

    <UForm
      :state="loginForm"
      :validate="validateLoginForm"
      :validate-on="['blur']"
      class="flex flex-col"
      @submit="submitLogin"
    >
      <UFormField
        label="อีเมล"
        name="email"
        :ui="{ label: 'text-[15px] font-bold text-ink' }"
      >
        <UInput
          v-model="loginForm.email"
          type="email"
          autocomplete="username"
          placeholder="admin@yoyopet"
          trailing-icon="i-lucide-mail"
          class="mt-1 w-full"
          :ui="{ base: 'h-12 rounded-xl px-4 text-base ring-[1.5px]', trailingIcon: 'text-muted' }"
        />
      </UFormField>

      <UFormField
        label="รหัสผ่าน"
        name="password"
        class="mt-6"
        :ui="{ label: 'text-[15px] font-bold text-ink' }"
      >
        <UInput
          v-model="loginForm.password"
          :type="isPasswordVisible ? 'text' : 'password'"
          autocomplete="current-password"
          class="mt-1 w-full"
          :ui="{ base: 'h-12 rounded-xl px-4 text-base ring-[1.5px]', trailing: 'pe-2' }"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="md"
              :icon="isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="isPasswordVisible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
              :aria-pressed="isPasswordVisible"
              class="text-muted"
              @click="isPasswordVisible = !isPasswordVisible"
            />
          </template>
        </UInput>
      </UFormField>

      <div class="mt-9 flex items-center justify-between">
        <UCheckbox
          v-model="shouldRememberEmail"
          label="จดจำอีเมลนี้"
          :ui="{ base: 'size-5 rounded-md', label: 'text-[15px] font-normal text-ink' }"
        />
        <ULink
          to="/forgot-password"
          class="text-[15px] font-bold text-primary-dark hover:underline"
        >
          ลืมรหัสผ่าน?
        </ULink>
      </div>

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
        เข้าสู่ระบบ
      </UButton>
    </UForm>

    <div class="mt-8 flex gap-3 rounded-xl bg-cream px-6 py-[18px]">
      <UIcon
        name="i-lucide-shield"
        class="mt-0.5 size-5 shrink-0 text-primary-dark"
      />
      <div class="text-sm">
        <p class="text-ink">
          ระบบออกจากระบบอัตโนมัติเมื่อไม่ใช้งาน 30 นาที
        </p>
        <p class="mt-1.5 text-muted">
          ทุกการแก้ไขถูกบันทึกในบันทึกกิจกรรม
        </p>
      </div>
    </div>

    <p class="mt-11 text-center text-[15px] text-muted">
      ยังไม่มีบัญชี? ติดต่อเจ้าของร้านเพื่อขอสิทธิ์เข้าใช้
    </p>
  </div>
</template>
