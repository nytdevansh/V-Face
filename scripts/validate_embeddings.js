/**
 * V-Face SDK Embedding Validation Script
 * 
 * Tests MobileFaceNet model quality by comparing embeddings:
 * - Same person (variant via crop/brightness) → should be > 0.85
 * - Different persons → should be < 0.60
 * 
 * Usage: node scripts/validate_embeddings.js
 * 
 * Prerequisites: npm install --save-dev onnxruntime-node sharp
 */

const ort = require('onnxruntime-node');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const MODEL_PATH = path.resolve(__dirname, '../model/mobilefacenet.onnx');
const FACES_DIR = path.resolve(__dirname, 'test_faces');
const INPUT_SIZE = 112;

// ============================================================================
// Model Inference
// ============================================================================

let session = null;

async function loadModel() {
    const stats = fs.statSync(MODEL_PATH);
    console.log(`📦 Model size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    if (stats.size < 1_000_000) {
        throw new Error('Model too small — likely a placeholder. Run: python3 scripts/convert_model.py');
    }

    session = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['cpu'],
    });
    console.log(`✅ Model loaded. Input names: ${session.inputNames}, Output names: ${session.outputNames}`);
}

async function getEmbedding(imagePath) {
    // Load and preprocess with sharp
    const raw = await sharp(imagePath)
        .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'cover' })
        .removeAlpha()
        .raw()
        .toBuffer();

    // Convert to planar float32 [1, 3, 112, 112] with MobileFaceNet normalization
    const float32 = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
    const pixelCount = INPUT_SIZE * INPUT_SIZE;

    for (let i = 0; i < pixelCount; i++) {
        const r = raw[i * 3];
        const g = raw[i * 3 + 1];
        const b = raw[i * 3 + 2];

        // (x - 127.5) / 128.0
        float32[i] = (r - 127.5) / 128.0; // R plane
        float32[i + pixelCount] = (g - 127.5) / 128.0; // G plane
        float32[i + 2 * pixelCount] = (b - 127.5) / 128.0; // B plane
    }

    const tensor = new ort.Tensor('float32', float32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
    const results = await session.run({ input: tensor });
    const embedding = Object.values(results)[0].data;

    console.log(`   → Embedding dim: ${embedding.length}, norm: ${l2Norm(embedding).toFixed(4)}`);
    return Array.from(embedding);
}

// ============================================================================
// Variants (simulate same-person re-capture)
// ============================================================================

async function createVariants(imagePath, outputDir) {
    const base = path.basename(imagePath, path.extname(imagePath));

    // Variant 1: Slight crop (95% center)
    const cropPath = path.join(outputDir, `${base}_crop.jpg`);
    const meta = await sharp(imagePath).metadata();
    const cropPx = Math.round(Math.min(meta.width, meta.height) * 0.05);
    await sharp(imagePath)
        .extract({
            left: cropPx,
            top: cropPx,
            width: meta.width - 2 * cropPx,
            height: meta.height - 2 * cropPx
        })
        .toFile(cropPath);

    // Variant 2: Brightness shift (+15%)
    const brightPath = path.join(outputDir, `${base}_bright.jpg`);
    await sharp(imagePath)
        .modulate({ brightness: 1.15 })
        .toFile(brightPath);

    // Variant 3: Horizontal flip
    const flipPath = path.join(outputDir, `${base}_flip.jpg`);
    await sharp(imagePath)
        .flop()
        .toFile(flipPath);

    // Variant 4: JPEG compression (quality 40)
    const compressPath = path.join(outputDir, `${base}_q40.jpg`);
    await sharp(imagePath)
        .jpeg({ quality: 40 })
        .toFile(compressPath);

    return { cropPath, brightPath, flipPath, compressPath };
}

// ============================================================================
// Math Helpers
// ============================================================================

function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function l2Norm(v) {
    return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    console.log('='.repeat(60));
    console.log('V-Face SDK Embedding Validation');
    console.log('='.repeat(60));
    console.log();

    // 1. Load model
    await loadModel();
    console.log();

    // 2. Check for test images
    const personA = path.join(FACES_DIR, 'person_a1.jpg');
    const personB = path.join(FACES_DIR, 'person_b1.jpg');

    if (!fs.existsSync(personA) || !fs.existsSync(personB)) {
        console.error('❌ Missing test images. Place two face photos in scripts/test_faces/:');
        console.error('   person_a1.jpg — face of person A');
        console.error('   person_b1.jpg — face of person B (different person)');
        process.exit(1);
    }

    // 3. Generate variants of person A (simulate same-person re-capture)
    console.log('📸 Creating variants of person A...');
    const variants = await createVariants(personA, FACES_DIR);
    console.log();

    // 4. Generate embeddings
    console.log('🧠 Generating embeddings...');
    console.log('\n   Person A (original):');
    const embA1 = await getEmbedding(personA);

    console.log('   Person A (cropped 95%):');
    const embA_crop = await getEmbedding(variants.cropPath);

    console.log('   Person A (bright +15%):');
    const embA_bright = await getEmbedding(variants.brightPath);

    console.log('   Person A (flipped):');
    const embA_flip = await getEmbedding(variants.flipPath);

    console.log('   Person A (JPEG q40):');
    const embA_q40 = await getEmbedding(variants.compressPath);

    console.log('   Person B (different person):');
    const embB = await getEmbedding(personB);

    // 5. Compute similarities
    console.log('\n' + '='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));

    const samePerson = [
        { label: 'A vs A (crop)', sim: cosineSimilarity(embA1, embA_crop) },
        { label: 'A vs A (bright)', sim: cosineSimilarity(embA1, embA_bright) },
        { label: 'A vs A (flip)', sim: cosineSimilarity(embA1, embA_flip) },
        { label: 'A vs A (q40)', sim: cosineSimilarity(embA1, embA_q40) },
    ];

    const diffPerson = [
        { label: 'A vs B', sim: cosineSimilarity(embA1, embB) },
        { label: 'A(crop) vs B', sim: cosineSimilarity(embA_crop, embB) },
    ];

    console.log('\n✅ Same Person (should be > 0.85):');
    for (const { label, sim } of samePerson) {
        const status = sim > 0.85 ? '✅' : '❌';
        console.log(`   ${status} ${label.padEnd(20)} ${sim.toFixed(4)}`);
    }

    console.log('\n❌ Different Person (should be < 0.60):');
    for (const { label, sim } of diffPerson) {
        const status = sim < 0.60 ? '✅' : '⚠️';
        console.log(`   ${status} ${label.padEnd(20)} ${sim.toFixed(4)}`);
    }

    // 6. Summary
    const sameOk = samePerson.every(s => s.sim > 0.85);
    const diffOk = diffPerson.every(s => s.sim < 0.60);

    console.log('\n' + '='.repeat(60));
    if (sameOk && diffOk) {
        console.log('🎉 MODEL VALIDATED — embeddings are discriminative');
        console.log('   Safe to build matching infrastructure on top of this');
    } else if (sameOk && !diffOk) {
        console.log('⚠️  PARTIAL PASS — same-person OK but different-person threshold too high');
        console.log('   May need to raise the similarity threshold or use a different model');
    } else if (!sameOk && diffOk) {
        console.log('❌ FAIL — same-person similarity too low');
        console.log('   Model may not be robust enough. Consider ArcFace (512-d)');
    } else {
        console.log('❌ FAIL — both thresholds violated');
        console.log('   Model is not producing useful embeddings. Check input preprocessing.');
    }
    console.log('='.repeat(60));
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
