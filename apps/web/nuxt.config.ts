// apps/web/nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxt/eslint'],
  
  runtimeConfig: {
    public: {
      useMock: process.env.NUXT_PUBLIC_USE_MOCK !== 'false', // Varsayılan olarak true (Mock aktif)
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'https://api.instascope.io/v1'
    }
  }
})