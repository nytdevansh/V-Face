import { generateFingerprint } from '../fingerprint/index.js';

async function runTest() {
    console.log("Starting Fingerprint Test...");

    // 1. Create a mock embedding (128 array of floats)
    const mockEmbedding = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
        mockEmbedding[i] = Math.random() * 2 - 1; // Random values between -1 and 1
    }

    console.log("Generated mock embedding.");

    // 2. Derive fingerprint
    try {
        const fp1 = await generateFingerprint(mockEmbedding);
        console.log(`Fingerprint 1: ${fp1}`);

        // 3. Verify Determinism (Same input -> Same output)
        const fp2 = await generateFingerprint(mockEmbedding);
        console.log(`Fingerprint 2: ${fp2}`);

        if (fp1 === fp2) {
            console.log("✅ PASS: Deterministic generation confirmed.");
        } else {
            console.error("❌ FAIL: Fingerprints do not match!");
            process.exit(1);
        }

        // 4. Verify Sensitivity (Slight change -> Different output??)
        // Note: Our quantization is 4 decimals, so a VERY slight change might not change it.
        // Let's change it significantly.
        const modifiedEmbedding = new Float32Array(mockEmbedding);
        modifiedEmbedding[0] += 0.5;
        const fp3 = await generateFingerprint(modifiedEmbedding);

        if (fp1 !== fp3) {
            console.log("✅ PASS: Sensitivity confirmed (different inputs = different outputs).");
        } else {
            console.error("❌ FAIL: Collision detected on different inputs!");
        }

    } catch (err) {
        console.error("Test Failed:", err);
    }
}

runTest();
