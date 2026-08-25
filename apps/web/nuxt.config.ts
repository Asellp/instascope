// apps/web/nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxt/eslint'],

  app: {
    head: {
      htmlAttrs: {
        lang: 'tr'
      },
      title: 'InstaScope - Instagram Analytics Dashboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Instagram hesap analiz ve raporlama platformu.' }
      ]
    }
  },

  nitro: {
    compressPublicAssets: true
  },

  components: [
    {
      path: '~/components/charts',
      pathPrefix: false,
      global: true,
      lazy: true
    },
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  runtimeConfig: {
    public: {
      useMock: process.env.NUXT_PUBLIC_USE_MOCK !== 'false',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'https://api.instascope.io/v1'
    }
  }
})