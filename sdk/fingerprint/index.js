export async function generateFingerprint(rawEmbedding) {
    if (rawEmbedding.length !== 128) {
        throw new Error(`Invalid embedding dimension. Expected 128, got ${rawEmbedding.length}`);
    }

    const normalized = l2Normalize(rawEmbedding);
    const quantized = quantize(normalized);
    const serialized = JSON.stringify(quantized);
    const hash = await sha256(serialized);

    return hash;
}

function l2Normalize(vector) {
    let sum = 0;
    for (const val of vector) sum += val * val;
    const magnitude = Math.sqrt(sum);
    return vector.map(val => val / magnitude);
}

function quantize(vector) {
    return Array.from(vector).map(val => Number(val.toFixed(4)));
}

async function sha256(message) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    } else {
        const crypto = await import('crypto');
        return crypto.createHash('sha256').update(message).digest('hex');
    }
}
