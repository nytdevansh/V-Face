
import { VFaceSDK } from './index.js';
import { cosineSimilarity } from './embedding/pipeline.js';
import Jimp from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';
import * as faceapi from 'face-api.js';
import canvas from 'canvas';

// Setup Environment for Node
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SDK
const sdk = new VFaceSDK({
    registryUrl: 'http://localhost:3000',
    modelPath: path.join(__dirname, '../model/mobilefacenet.onnx')
});

// Mock Server Fetch for Demo
const MOCK_REGISTRY = {};

async function runDemo() {
    console.log("\n🤖 V-Face SDK Demo: LLM Guard Prevention\n");

    // 1. Enrollment
    console.log("📸 [Step 1] Enrolling User 'Alice'...");
    const aliceImage = await new Jimp(112, 112, 0xFF0000FF); // Red Face
    const aliceFingerprint = await sdk.getFingerprint(aliceImage);
    const aliceEmbedding = await sdk.getRawEmbedding(aliceImage);

    // Store in Mock Registry
    MOCK_REGISTRY[aliceFingerprint] = {
        embedding: aliceEmbedding,
        owner: 'Alice'
    };
    console.log(`✅ Alice Registered. FP: ${aliceFingerprint.substring(0, 10)}...`);

    // 2. Authorized Access
    console.log("\n🔓 [Step 2] Alice attempts to access LLM...");
    const authImage = await new Jimp(112, 112, 0xFF0000FF); // Same Red Face (with noise maybe?)
    // Add minor noise
    authImage.setPixelColor(0xFFFFFFFF, 10, 10);

    const authEmbedding = await sdk.getRawEmbedding(authImage);
    const authScore = cosineSimilarity(authEmbedding, MOCK_REGISTRY[aliceFingerprint].embedding);

    console.log(`🔍 Similarity: ${authScore.toFixed(4)}`);
    if (authScore > 0.85) {
        console.log("✅ ACCESS GRANTED. Executing LLM Prompt...");
    } else {
        console.log("❌ ACCESS DENIED.");
    }

    // 3. Unauthorized Access (Impostor)
    console.log("\n🔒 [Step 3] Eve (Impostor) attempts to access LLM as Alice...");
    const eveImage = await new Jimp(112, 112, 0x00FF00FF); // Green Face
    const eveEmbedding = await sdk.getRawEmbedding(eveImage);
    const eveScore = cosineSimilarity(eveEmbedding, MOCK_REGISTRY[aliceFingerprint].embedding);

    console.log(`🔍 Similarity: ${eveScore.toFixed(4)}`);
    if (eveScore > 0.85) {
        console.log("✅ ACCESS GRANTED.");
    } else {
        console.log("⛔ ACCESS DENIED. Biometric Mismatch.");
    }
    console.log("\n");
}

runDemo().catch(console.error);
