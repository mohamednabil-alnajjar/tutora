import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

// دعم أقصى للمتصفحات القديمة (موبايلات قديمة و WebView جوه التطبيقات)
export default defineConfig({
  base: './',
  build: {
    target: 'es2015',
    cssTarget: 'chrome61',
  },
  plugins: [
    react(),
    legacy({
      targets: ['Chrome >= 55', 'Android >= 6', 'iOS >= 11', 'Samsung >= 6'],
      modernPolyfills: true,
      renderModernChunks: false,
    }),
  ],
})
