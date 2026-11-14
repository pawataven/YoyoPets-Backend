export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint', '@nuxt/image', '@nuxtjs/supabase'],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'th' },
      title: 'YoyoPet Admin'
    }
  },

  css: ['~/assets/css/main.css'],

  supabase: {
    types: '~~/shared/types/database.types.ts',
    // No login page yet; turn this on together with the admin email + TOTP sign-in
    redirect: false
  },

  ui: {
    // The brand palette is light-only; without this Nuxt UI follows the OS dark mode
    colorMode: false
  },

  compatibilityDate: '2025-07-15',

  typescript: {
    strict: true
  },

  fonts: {
    families: [
      { name: 'Anuphan', provider: 'google', weights: [400, 500, 600], subsets: ['thai', 'latin'], global: true },
      { name: 'Mitr', provider: 'google', weights: [500], subsets: ['thai', 'latin'], global: true },
      { name: 'Fredoka', provider: 'google', weights: [600], subsets: ['latin'], global: true }
    ]
  },

  icon: {
    serverBundle: { collections: ['lucide'] }
  }
})
