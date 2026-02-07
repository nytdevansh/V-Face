import { sha256, toUtf8Bytes } from "ethers";

/**
 * Hashes a face encoding vector using SHA256.
 * Matches the contract's expected input format.
 * 
 * @param {Float32Array|number[]} encoding - The 128-dimensional face encoding vector
 * @returns {string} The 0x-prefixed SHA256 hash
 */
export function hashEncoding(encoding) {
    if (!encoding || encoding.length === 0) {
        throw new Error("Invalid encoding: must be a non-empty array or Float32Array");
    }

    // Convert to string to match the "encoding.toString()" comment in contract
    // This ensures deterministic hashing of the vector values
    const encodingString = encoding.toString();

    // SHA256 hash the string representation
    return sha256(toUtf8Bytes(encodingString));
}
