// nuxt.config.ts
export default defineNuxtConfig({
  // SSR is enabled by default in Nuxt 3
  ssr: true,
  
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  
  app: {
    head: {
      title: 'Property Catalog',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Dynamic property catalog with filtering and pagination' }
      ]
    }
  },
  
  css: [
    '~/assets/css/main.css'
  ],
  
  build: {
    transpile: []
  }
})