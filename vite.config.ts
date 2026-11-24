import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

// دعم المتصفحات القديمة (موبايلات زي Galaxy J6 و WebView بتاع تليجرام)
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['Chrome >= 61', 'Android >= 7', 'iOS >= 12', 'Samsung >= 8'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],
})
