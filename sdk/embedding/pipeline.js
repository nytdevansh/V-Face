import * as ort from 'onnxruntime-web';

// ============================================================================
// MobileFaceNet Configuration
// ============================================================================
// Source: foamliu/MobileFaceNet (Apache-2.0)
// Architecture: MobileNetV2 backbone for face recognition
// Input:  [1, 3, 112, 112] — RGB face crop, normalized (x - 127.5) / 128.0
// Output: [1, 128] — face embedding vector
//
// Model SHA-256: 85cdeb7368ed6a1e9cbaaa6f283c6b2439f1fa533c17450bfdc7f357d285d5d1
// ============================================================================

const MODEL_CONFIG = {
    inputMult: 1 / 128.0,
    inputAdd: -127.5,
    outputDim: 128,
    inputSize: 112,
    minModelSizeBytes: 1_000_000, // Real model is ~3.8 MB; reject stubs
};

let inferenceSession = null;

/**
 * Loads the ONNX model from a URL or file path.
 * Throws if the model cannot be loaded.
 * @param {string} modelPath 
 */
export async function loadModel(modelPath) {
    console.log(`Loading model from ${modelPath}...`);

    let sessionOptions = {
        executionProviders: ['wasm'],
    };

    // Node.js environment: validate file size first, then load from buffer
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const fs = await import('fs');

        if (!fs.existsSync(modelPath)) {
            throw new Error(`Model file not found: ${modelPath}`);
        }

        const stats = fs.statSync(modelPath);
        if (stats.size < MODEL_CONFIG.minModelSizeBytes) {
            throw new Error(
                `Model file too small (${stats.size} bytes). Expected ≥${MODEL_CONFIG.minModelSizeBytes} bytes. ` +
                `This is likely a placeholder. Run: python3 scripts/convert_model.py`
            );
        }

        const buffer = fs.readFileSync(modelPath);
        inferenceSession = await ort.InferenceSession.create(buffer, sessionOptions);
    } else {
        // Browser environment
        inferenceSession = await ort.InferenceSession.create(modelPath, sessionOptions);
    }

    console.log("✅ MobileFaceNet model loaded successfully");
}

/**
 * Preprocesses an image and runs it through the MobileFaceNet model.
 * @param {HTMLImageElement | HTMLCanvasElement} imageSource 
 * @returns {Promise<Float32Array>} 128-dimensional embedding vector
 * @throws {Error} If model is not loaded or output dimension is unexpected
 */
export async function generateEmbedding(imageSource) {
    if (!inferenceSession) {
        throw new Error(
            "Model not loaded. Call loadModel() first. " +
            "If the model file is missing or a placeholder, run: python3 scripts/convert_model.py"
        );
    }

    // 1. Preprocess: Resize & Normalize
    const tensor = await preprocessImage(imageSource);

    // 2. Inference
    const feeds = { input: tensor };
    const results = await inferenceSession.run(feeds);

    // 3. Postprocess: Get the output tensor
    const outputTensor = Object.values(results)[0];
    const embedding = outputTensor.data;

    // 4. Runtime assertion: verify embedding dimension
    if (embedding.length !== MODEL_CONFIG.outputDim) {
        throw new Error(
            `Embedding dimension mismatch: got ${embedding.length}, expected ${MODEL_CONFIG.outputDim}. ` +
            `Model may be corrupted or incompatible.`
        );
    }

    return embedding; // Float32Array
}

/**
 * Converts image source to ONNX Tensor [1, 3, 112, 112]
 * Pipeline: Resize -> RGB Split -> Normalize -> Tensor
 * Compatible with both browser (HTMLImageElement/Canvas) and Node.js (via canvas library)
 */
async function preprocessImage(imageSource) {
    const width = MODEL_CONFIG.inputSize;
    const height = MODEL_CONFIG.inputSize;

    let canvas, ctx, imageData;

    // Node.js environment: use 'canvas' library
    if (typeof window === 'undefined') {
        const canvasModule = await import('canvas');
        canvas = canvasModule.createCanvas(width, height);
        ctx = canvas.getContext('2d');

        // Handle different input types in Node.js
        if (imageSource && typeof imageSource.buffers === 'object') {
            // It's a canvas already
            const imageCanvas = imageSource;
            ctx.drawImage(imageCanvas, 0, 0, width, height);
        } else if (imageSource && imageSource.data && typeof imageSource.data === 'object') {
            // It's already ImageData
            imageData = imageSource;
        } else {
            throw new Error('Node.js: imageSource must be a Canvas or ImageData object');
        }
    } else {
        // Browser environment
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
        ctx.drawImage(imageSource, 0, 0, width, height);
    }

    // Get pixel data from canvas if we haven't already
    if (!imageData && ctx) {
        imageData = ctx.getImageData(0, 0, width, height);
    }

    const { data } = imageData;

    // ONNX expects Planar format [1, 3, 112, 112] (Batch, Channel, Height, Width)
    const float32Data = new Float32Array(1 * 3 * width * height);

    for (let i = 0; i < width * height; ++i) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];

        // Normalize: (x - 127.5) / 128.0
        float32Data[i] = (r + MODEL_CONFIG.inputAdd) * MODEL_CONFIG.inputMult;                           // Red
        float32Data[i + width * height] = (g + MODEL_CONFIG.inputAdd) * MODEL_CONFIG.inputMult;           // Green
        float32Data[i + 2 * width * height] = (b + MODEL_CONFIG.inputAdd) * MODEL_CONFIG.inputMult;       // Blue
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
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
