// vite.cofig.js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  base: '/',

  plugins: [vue(), vueDevTools(), visualizer()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // --- OPTIMASI BUILD (Solusi "Large Chunk Warning") ---
  build: {
    // Naikkan limit warning sedikit (opsional, untuk menghilangkan noise log)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Logika pemisahan file vendor (library) dari kode aplikasi
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 1. Framework Core (Vue, Pinia, Router)
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vue-vendor'
            }

            // 2. Heavy Libs - Split individually
            if (id.includes('xlsx')) return 'xlsx'
            if (id.includes('pdfjs-dist')) return 'pdf-vendor'
            if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) return 'charts'
            if (id.includes('lodash')) return 'lodash'

            // 3. UI Libs
            if (id.includes('@fortawesome') || id.includes('fontawesome')) {
              return 'ui-vendor'
            }

            // 4. Fallback for others (axios, dayjs, etc.)
            return 'vendor'
          }
        },
      },
    },
  },

  // --- DEV SERVER CONFIG ---
  server: {
    port: 5173,
    proxy: {
      // Mengarahkan request API ke Backend Node.js
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Mengarahkan request gambar/file statis ke folder public Backend
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
