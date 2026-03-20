import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    rollupOptions: {
      external: ['fs', 'canvas'],
      onwarn(warning, warn) {
        // Suppress warnings about fs and canvas being externalized
        if (warning.message?.includes('externalized for browser compatibility')) {
          return;
        }
        warn(warning);
      },
      output: {
        globals: {
          fs: 'fs',
          canvas: 'canvas',
        },
        // Split large dependencies into separate chunks for parallel loading + caching
        manualChunks: {
          'face-api': ['face-api.js'],
          'framer': ['framer-motion'],
          'ethers': ['ethers'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
