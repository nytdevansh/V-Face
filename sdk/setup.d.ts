/**
 * V-Face SDK Setup Helper — TypeScript Definitions
 */

import { VFaceSDK, VFaceConfig } from './index';

export interface SetupOptions extends VFaceConfig {
    autoInit?: boolean;
}

export interface ValidationResult {
    modelLoaded: boolean;
    registryAccessible: boolean;
    embeddingWorks: boolean;
    errors: string[];
}

/**
 * Setup and initialize the SDK with sensible defaults
 */
export function setupSDK(options?: SetupOptions): Promise<VFaceSDK>;

/**
 * Validate SDK setup before deployment
 */
export function validateSDKSetup(sdk: VFaceSDK): Promise<ValidationResult>;

/**
 * Create a test embedding for validation
 */
export function createTestEmbedding(): Float32Array;

export default setupSDK;
