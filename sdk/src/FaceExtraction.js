const faceapi = require("face-api.js");

// Note: In a Node.js environment, face-api.js requires canvas and tensorflow/tfjs-node.
// This module assumes it's running in ref or where face-api is properly shimmed.
// For a browser-focused SDK, we export helpers.

/**
 * Loads standard models from a provided URL path.
 * @param {string} modelUrl - Path to model directory
 */
async function loadModels(modelUrl) {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
}

/**
 * Extracts face encoding from an image input.
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Image source
 * @returns {Promise<Float32Array>} 128-d descriptor
 */
async function extractFaceEncoding(input) {
    const detection = await faceapi.detectSingleFace(input)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        throw new Error("No face detected in input");
    }

    return detection.descriptor;
}

module.exports = {
    loadModels,
    extractFaceEncoding
};
