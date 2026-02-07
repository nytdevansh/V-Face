
/**
 * V-Face LLM Guard Example
 * 
 * This example demonstrates how to wrap an LLM generation call with V-Face
 * biometric authentication. This ensures that only the authorized user can
 * trigger the LLM to perform sensitive actions.
 * 
 * Usage:
 * import { protectedGenerate } from './llm_guard.js';
 * await protectedGenerate(userImage, prompt);
 */

import { VFaceSDK, cosineSimilarity } from '@v-face/sdk';

// Initialize SDK
const sdk = new VFaceSDK({
    registryUrl: process.env.VFACE_REGISTRY_URL || 'https://api.v-face.org',
    modelPath: '/model/mobilefacenet.onnx'
});

// Configure Threshold
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Biometric Guard for LLM Calls
 * @param {HTMLImageElement|Buffer} faceImage - The face image captured from the user
 * @param {string} prompt - The prompt the user wants to send to the LLM
 * @param {string} claimedFingerprint - The user's registered fingerprint ID
 * @returns {Promise<string>} - The LLM response or an error
 */
export async function protectedGenerate(faceImage, prompt, claimedFingerprint) {
    console.log("🔒 V-Face Guard: Verifying Identity...");

    try {
        // 1. Check if identity exists and get stored embedding
        const response = await fetch(`${sdk.registry.apiUrl}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint: claimedFingerprint })
        });
        const record = await response.json();

        if (!record.exists) {
            throw new Error("⛔ Identity Not Registered. Access Denied.");
        }

        if (record.revoked) {
            throw new Error("⛔ Identity Revoked. Access Denied.");
        }

        // 2. Generate Fresh Embedding from current image
        // (Ensure this happens on the CLIENT side for privacy)
        const freshEmbedding = await sdk.getRawEmbedding(faceImage);

        // 3. Retrieve Stored Embedding (Encrypted in prod, assumed decrypt here)
        const storedEmbedding = new Float32Array(JSON.parse(record.embedding));

        // 4. Compare
        const score = cosineSimilarity(freshEmbedding, storedEmbedding);
        console.log(`🔍 Similarity Score: ${score.toFixed(4)}`);

        if (score < SIMILARITY_THRESHOLD) {
            throw new Error(`⛔ Biometric Mismatch (Score: ${score.toFixed(4)} < ${SIMILARITY_THRESHOLD}). Access Denied.`);
        }

        console.log("✅ Identity Verified. Proceeding to LLM...");

        // 5. Call LLM (Mock Example)
        // In reality, you would call OpenAI / Anthropic here
        return await mockLLMCall(prompt);

    } catch (error) {
        console.error(error.message);
        return { error: error.message };
    }
}

async function mockLLMCall(prompt) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(`🤖 LLM Response to: "${prompt}" - Confirmed by V-Face.`);
        }, 1000);
    });
}
