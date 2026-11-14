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

  runtimeConfig: {
    public: {
      // Target of the top bar's "ดูหน้าเว็บสมาชิก" link; set NUXT_PUBLIC_MEMBER_SITE_URL per environment
      memberSiteUrl: 'http://localhost:3000'
    }
  },

  supabase: {
    types: '~~/shared/types/database.types.ts',
    // The module's redirect only knows "signed in or not"; middleware/admin-auth.global.ts also enforces
    // an active admin_users row and TOTP (aal2)
    redirect: false
  },

  ui: {
    // The brand palette is light-only; without this Nuxt UI follows the OS dark mode
    colorMode: false
  },

  // The member app owns port 3000 so both can run side by side
  devServer: { port: 3001 },

  compatibilityDate: '2025-07-15',

  typescript: {
    strict: true
  },

  fonts: {
    families: [
      { name: 'Anuphan', provider: 'google', weights: [400, 500, 600, 700], subsets: ['thai', 'latin'], global: true },
      { name: 'Mitr', provider: 'google', weights: [400, 500, 700], subsets: ['thai', 'latin'], global: true },
      { name: 'Fredoka', provider: 'google', weights: [400, 600, 700], subsets: ['latin'], global: true }
    ]
  },

  icon: {
    serverBundle: { collections: ['lucide'] }
  }
})
