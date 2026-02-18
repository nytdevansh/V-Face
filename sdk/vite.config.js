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
            external: ['onnxruntime-web', 'ethers'],
            output: {
                globals: {
                    'onnxruntime-web': 'ort',
                    'ethers': 'ethers'
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
