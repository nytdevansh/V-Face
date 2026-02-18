/**
 * V-Face Embedding Pipeline — TypeScript Definitions
 * Face embedding extraction using MobileFaceNet ONNX model
 */

/**
 * Loads the ONNX model from a URL or file path.
 * @param modelPath - Path to the ONNX model file
 * @throws {Error} If the model cannot be loaded
 */
export function loadModel(modelPath: string): Promise<void>;

/**
 * Preprocesses an image and runs it through the MobileFaceNet model.
 * @param imageSource - HTMLImageElement, HTMLCanvasElement (browser) or Canvas (Node.js)
 * @returns 128-dimensional embedding vector
 * @throws {Error} If model is not loaded or output dimension is unexpected
 */
export function generateEmbedding(imageSource: any): Promise<Float32Array>;

/**
 * Compute Cosine Similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Score between -1 and 1
 */
export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number;
