import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
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
      },
    },
  },
})
