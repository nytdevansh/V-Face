/**
 * V-Face Liveness Detection (Anti-Spoofing)
 * 
 * Client-side passive liveness check using a FAS (Face Anti-Spoofing) model.
 * Detects photo/video replay attacks by analyzing texture artifacts,
 * reflection patterns, and moiré effects.
 * 
 * Uses ONNX Runtime Web for inference — same runtime as MobileFaceNet.
 * 
 * Usage:
 *   import { LivenessDetector } from './liveness.js';
 *   const detector = new LivenessDetector();
 *   await detector.init('/model/fas_net.onnx');
 *   const { isLive, score } = await detector.check(imageElement);
 */

let ort;

// Lazy-load ONNX Runtime
async function getOrt() {
    if (ort) return ort;
    ort = await import('onnxruntime-web');
    return ort;
}

export class LivenessDetector {
    constructor(config = {}) {
        this.session = null;
        this.modelPath = config.modelPath || '/model/fas_net.onnx';
        this.threshold = config.threshold || 0.5;
        this.inputSize = config.inputSize || 80; // FAS models typically use 80x80
        this.isLoaded = false;
    }

    /**
     * Initialize the liveness detection model.
     * @param {string} [modelPath] - Path to the FAS ONNX model
     */
    async init(modelPath) {
        if (this.isLoaded) return;

        const ortModule = await getOrt();
        const path = modelPath || this.modelPath;

        try {
            this.session = await ortModule.InferenceSession.create(path, {
                executionProviders: ['wasm'],
            });
            this.isLoaded = true;
            console.log('✅ Liveness model loaded');
        } catch (err) {
            console.warn('⚠️ Liveness model not available:', err.message);
            console.warn('   Download a FAS model and place at:', path);
            // Graceful degradation — liveness check will be skipped
            this.isLoaded = false;
        }
    }

    /**
     * Check if the face image is from a live person (not a photo/video replay).
     * 
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imageSource
     * @returns {Promise<{isLive: boolean, score: number, available: boolean}>}
     */
    async check(imageSource) {
        // Graceful degradation if model not loaded
        if (!this.isLoaded || !this.session) {
            return { isLive: true, score: 1.0, available: false };
        }

        try {
            const ortModule = await getOrt();

            // Preprocess: resize to model input size
            const canvas = document.createElement('canvas');
            canvas.width = this.inputSize;
            canvas.height = this.inputSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageSource, 0, 0, this.inputSize, this.inputSize);

            const imageData = ctx.getImageData(0, 0, this.inputSize, this.inputSize);
            const { data } = imageData;

            // Convert to CHW float tensor (normalize to [0, 1])
            const channels = 3;
            const pixels = this.inputSize * this.inputSize;
            const float32Data = new Float32Array(channels * pixels);

            for (let i = 0; i < pixels; i++) {
                // RGB channels
                float32Data[i] = data[i * 4] / 255.0;                         // R
                float32Data[pixels + i] = data[i * 4 + 1] / 255.0;           // G
                float32Data[2 * pixels + i] = data[i * 4 + 2] / 255.0;     // B
            }

            const tensor = new ortModule.Tensor('float32', float32Data, [1, channels, this.inputSize, this.inputSize]);

            // Get input name from model
            const inputName = this.session.inputNames[0];
            const feeds = { [inputName]: tensor };

            // Run inference
            const results = await this.session.run(feeds);
            const outputName = this.session.outputNames[0];
            const output = results[outputName].data;

            // Interpret output as liveness score (sigmoid if needed)
            let score;
            if (output.length === 1) {
                // Single score output
                score = 1 / (1 + Math.exp(-output[0])); // Sigmoid
            } else if (output.length === 2) {
                // Two-class softmax [fake, real]
                const expFake = Math.exp(output[0]);
                const expReal = Math.exp(output[1]);
                score = expReal / (expFake + expReal);
            } else {
                // Multi-scale output — average
                const avg = Array.from(output).reduce((a, b) => a + b, 0) / output.length;
                score = 1 / (1 + Math.exp(-avg));
            }

            return {
                isLive: score >= this.threshold,
                score: Math.round(score * 10000) / 10000,
                available: true,
            };

        } catch (err) {
            console.error('Liveness check error:', err);
            // Fail open (configurable — production should fail closed)
            return { isLive: true, score: 0, available: false, error: err.message };
        }
    }
}

export default LivenessDetector;
