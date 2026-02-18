import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'index.js',
            name: 'VFaceSDK',
            formats: ['es', 'umd'],
            fileName: (format) => `v-face-sdk.${format === 'es' ? 'module' : 'umd'}.js`
        },
        rollupOptions: {
            external: ['onnxruntime-web', 'ethers', 'fs', 'canvas'],
            onwarn(warning, warn) {
                // Suppress warnings about fs and canvas being externalized
                if (warning.message?.includes('externalized for browser compatibility')) {
                    return;
                }
                warn(warning);
            },
            output: {
                globals: {
                    'onnxruntime-web': 'ort',
                    'ethers': 'ethers',
                    'fs': 'fs',
                    'canvas': 'canvas'
                }
            }
        },
        outDir: 'dist',
        sourcemap: true,
        minify: 'terser',
        target: 'es2020'
    },
    resolve: {
        extensions: ['.js', '.mjs']
    }
});
