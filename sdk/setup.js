/**
 * V-Face SDK Setup Helper
 *
 * Usage:
 *   import { setupSDK } from './setup.js';
 *   const sdk = await setupSDK();
 */

import { VFaceSDK } from './index.js';

/**
 * Setup and initialize the SDK with sensible defaults
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.registryUrl] - Registry API URL
 * @param {string} [options.modelPath] - Path to ONNX model
 * @param {boolean} [options.autoInit=true] - Auto-initialize on setup
 * @returns {Promise<VFaceSDK>} Initialized SDK instance
 */
export async function setupSDK(options = {}) {
    const {
        registryUrl = process.env.VFACE_REGISTRY_URL || 'http://localhost:3000',
        modelPath = process.env.MODEL_PATH || '/model/mobilefacenet.onnx',
        autoInit = true
    } = options;

    const sdk = new VFaceSDK({
        registryUrl,
        modelPath
    });

    if (autoInit) {
        try {
            await sdk.init();
            console.log('✅ V-Face SDK initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize V-Face SDK:', error.message);
            throw error;
        }
    }

    return sdk;
}

/**
 * Validate SDK setup before deployment
 *
 * @param {VFaceSDK} sdk - SDK instance to validate
 * @returns {Promise<Object>} Validation results
 */
export async function validateSDKSetup(sdk) {
    const results = {
        modelLoaded: false,
        registryAccessible: false,
        embeddingWorks: false,
        errors: []
    };

    // Test model loading
    try {
        if (!sdk.isLoaded) {
            await sdk.init();
        }
        results.modelLoaded = true;
    } catch (error) {
        results.errors.push(`Model loading failed: ${error.message}`);
    }

    // Test registry accessibility
    try {
        const testFp = 'a'.repeat(64);
        await sdk.check(testFp);
        results.registryAccessible = true;
    } catch (error) {
        results.errors.push(`Registry not accessible: ${error.message}`);
    }

    return results;
}

/**
 * Create a test embedding for validation
 *
 * @returns {Float32Array} Deterministic test embedding
 */
export function createTestEmbedding() {
    const embedding = new Float32Array(128);
    const seed = 12345;  // Fixed seed for reproducibility
    let s = seed;

    for (let i = 0; i < 128; i++) {
        s = (s * 9301 + 49297) % 233280;
        embedding[i] = (s / 233280) * 2 - 1;
    }

    // L2 normalize
    let norm = 0;
    for (let i = 0; i < 128; i++) norm += embedding[i] ** 2;
    norm = Math.sqrt(norm);
    for (let i = 0; i < 128; i++) embedding[i] /= norm;

    return embedding;
}

export default setupSDK;
