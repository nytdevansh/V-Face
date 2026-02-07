import { loadModel, generateEmbedding } from './embedding/pipeline.js';
import { generateFingerprint } from './fingerprint/index.js';
import { Registry } from './registry/index.js';

export class VFaceSDK {
    constructor(config = {}) {
        this.registry = new Registry(config.registryUrl);
        this.modelPath = config.modelPath || '/model/mobilefacenet.onnx';
        this.isLoaded = false;
    }

    /**
     * Initialize the SDK (load models)
     */
    async init() {
        if (this.isLoaded) return;
        await loadModel(this.modelPath);
        this.isLoaded = true;
    }

    /**
     * Process a face image and return its robust fingerprint.
     * @param {HTMLImageElement} imageSource 
     * @returns {Promise<string>} 64-char Hex Fingerprint
     */
    async getFingerprint(imageSource) {
        if (!this.isLoaded) await this.init();

        // 1. Get raw embedding
        const embedding = await generateEmbedding(imageSource);

        // 2. Generate fingerprint
        const fingerprint = await generateFingerprint(embedding);

        return fingerprint;
    }

    /**
     * Get raw embedding vector (Float32Array) for registration/verification
     * @param {HTMLImageElement} imageSource 
     * @returns {Promise<Float32Array>}
     */
    async getRawEmbedding(imageSource) {
        if (!this.isLoaded) await this.init();
        return await generateEmbedding(imageSource);
    }
}

// Export helpers
export { cosineSimilarity } from './embedding/pipeline.js';
