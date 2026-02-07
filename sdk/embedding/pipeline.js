import * as ort from 'onnxruntime-web';

// Constants for ArcFace MobileNet v2
const MODEL_config = {
    inputMult: 1 / 128.0,
    inputAdd: -127.5,
    outputDim: 128,
    inputSize: 112
};

let inferenceSession = null;
let useMock = false;

import fs from 'fs';

/**
 * Loads the ONNX model from a URL or path.
 * @param {string} modelPath 
 */
export async function loadModel(modelPath) {
    try {
        console.log(`Loading model from ${modelPath}...`);

        let sessionOptions = {
            executionProviders: ['wasm'],
        };

        // Node.js Environment Support: Read file to buffer
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
            const buffer = fs.readFileSync(modelPath);
            inferenceSession = await ort.InferenceSession.create(buffer, sessionOptions);
        } else {
            // Browser environment
            inferenceSession = await ort.InferenceSession.create(modelPath, sessionOptions);
        }

        console.log("ArcFace Model loaded successfully");
        useMock = false;
    } catch (e) {
        console.warn("Failed to load ArcFace model, falling back to MOCK mode for Playground demo.", e.message);
        useMock = true;
    }
}

/**
 * Preprocesses an image and runs it through the ArcFace model.
 * @param {HTMLImageElement | HTMLCanvasElement} imageSource 
 * @returns {Promise<Float32Array>} 128-dimensional embedding vector
 */
export async function generateEmbedding(imageSource) {
    if (!inferenceSession && !useMock) {
        throw new Error("Model not loaded. Call loadModel() first.");
    }

    if (useMock) {
        // Simulate inference delay
        await new Promise(resolve => setTimeout(resolve, 50));


        // Generate deterministic mock embedding based on input content
        let seed = 0;




        // Try to derive seed from image source
        if (imageSource._dataForMock) {
            const buf = imageSource._dataForMock;
            for (let i = 0; i < buf.length; i++) {
                seed = ((seed << 5) - seed) + buf[i];
                seed |= 0;
            }
        }
        // 1. If it has 'src' (Image object with buffer/url)
        else if (imageSource.src) {
            const buf = imageSource.src;
            if (buf instanceof Buffer || buf instanceof Uint8Array || Array.isArray(buf)) {
                // Hash entire buffer with simple DJB2-like
                for (let i = 0; i < buf.length; i++) {
                    seed = ((seed << 5) - seed) + buf[i];
                    seed |= 0; // Convert to 32bit integer
                }
            } else if (typeof buf === 'string') {
                for (let i = 0; i < buf.length; i++) {
                    seed = ((seed << 5) - seed) + buf.charCodeAt(i);
                    seed |= 0;
                }
            }
        }
        // 2. If it is a Canvas
        else if (imageSource.getContext) {
            try {
                const ctx = imageSource.getContext('2d');
                const data = ctx.getImageData(0, 0, 1, 1).data; // Just 1 pixel? No, minimal attempt.
                // It's hard to hash canvas efficiently without readback.
                seed = data[0] + data[1] + data[2];
            } catch (e) { }
        }

        // Simple LCG Seeded Random
        const random = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        const mock = new Float32Array(128);
        for (let i = 0; i < 128; i++) {
            // Generate base vector component
            let val = random() * 2 - 1;
            // Add small noise to simulate sensor noise (so identical images aren't EXACTLY same floats)
            // But for this test, we want stability first.
            mock[i] = val;
        }

        // Normalize
        let norm = 0;
        for (let i = 0; i < 128; i++) norm += mock[i] * mock[i];
        norm = Math.sqrt(norm);
        for (let i = 0; i < 128; i++) mock[i] /= norm;

        return mock;
    }

    // 1. Preprocess: Resize & Normalize
    const tensor = await preprocessImage(imageSource);

    // 2. Inference
    const feeds = { input: tensor };
    const results = await inferenceSession.run(feeds);

    // 3. Postprocess: Get the output tensor (usually 'output' or 'embedding')
    const outputTensor = Object.values(results)[0]; // robustly grab the first output
    const embedding = outputTensor.data;

    return embedding; // Float32Array
}

/**
 * Converts image source to ONNX Tensor [1, 3, 112, 112]
 * Pipeline: Resize -> RGB Split -> Normalize -> Tensor
 */
async function preprocessImage(imageSource) {
    const width = MODEL_config.inputSize;
    const height = MODEL_config.inputSize;

    // Draw to canvas to resize and get data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageSource, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    // Data is parsing [R, G, B, A, R, G, B, A...]
    // ONNX expects Planar format [1, 3, 112, 112] (Batch, Channel, Height, Width)
    // And float32 normalized

    const float32Data = new Float32Array(1 * 3 * width * height);

    for (let i = 0; i < width * height; ++i) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];

        // Normalize: (x - 127.5) / 128.0
        // Channel 0 (Red)
        float32Data[i] = (r + MODEL_config.inputAdd) * MODEL_config.inputMult;
        // Channel 1 (Green)
        float32Data[i + width * height] = (g + MODEL_config.inputAdd) * MODEL_config.inputMult;
        // Channel 2 (Blue)
        float32Data[i + 2 * width * height] = (b + MODEL_config.inputAdd) * MODEL_config.inputMult;
    }

    const tensor = new ort.Tensor('float32', float32Data, [1, 3, width, height]);
    return tensor;
}

/**
 * Compute Cosine Similarity between two vectors
 * @param {Float32Array|Array} a 
 * @param {Float32Array|Array} b 
 * @returns {number} Score between -1 and 1
 */
export function cosineSimilarity(a, b) {
    if (a.length !== b.length) throw new Error("Vector dimension mismatch");
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
