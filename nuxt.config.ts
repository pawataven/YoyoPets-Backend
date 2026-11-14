export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint', '@nuxt/image'],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'th' },
      title: 'YoyoPet Admin'
    }
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-07-15',

  typescript: {
    strict: true
  },

  icon: {
    serverBundle: { collections: ['lucide'] }
  }
})
