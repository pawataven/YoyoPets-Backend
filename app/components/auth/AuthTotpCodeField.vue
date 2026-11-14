<script setup lang="ts">
import type { TotpCodeDigits } from '~/types/admin'

const code = defineModel<TotpCodeDigits>({ required: true })

defineProps<{
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  complete: []
}>()
</script>

<template>
  <UFormField
    :label="label"
    :ui="{ label: 'text-[15px] font-bold text-ink' }"
  >
    <!-- 66×72 boxes at the design width; narrower phones get smaller boxes so all six fit on one line -->
    <UPinInput
      v-model="code"
      :length="6"
      otp
      type="number"
      autofocus
      :disabled="disabled"
      aria-label="รหัส 6 หลักจากแอป Authenticator"
      :class="label ? 'mt-1' : undefined"
      :ui="{
        root: 'gap-2 sm:gap-4',
        base: 'h-14 w-10 rounded-xl font-number text-2xl font-bold text-ink ring-[1.5px] focus-visible:ring-2 min-[400px]:w-11 sm:h-[72px] sm:w-[66px] sm:text-[32px]'
      }"
      @complete="emit('complete')"
    />
  </UFormField>
</template>
