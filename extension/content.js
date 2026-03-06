/**
 * V-Face Browser Extension — Content Script
 * 
 * Injects `window.vface` into any webpage, similar to how MetaMask injects `window.ethereum`.
 * Third-party apps can use this to add face verification in 3 lines of code:
 * 
 *   if (window.vface) {
 *     const result = await window.vface.verify(imageElement);
 *     console.log('Match:', result.matched);
 *   }
 */

(function () {
    'use strict';

    // Prevent double injection
    if (window.__vface_injected) return;
    window.__vface_injected = true;

    const REGISTRY_URL = 'https://api.v-face.org'; // Production URL

    /**
     * Lightweight V-Face interface injected into pages.
     * Full SDK is loaded on-demand.
     */
    window.vface = {
        version: '1.0.0',
        ready: false,
        _sdk: null,

        /**
         * Initialize the SDK (loads on first call).
         */
        async init(config = {}) {
            if (this._sdk) return this._sdk;

            // Dynamically import SDK
            try {
                const { VFaceSDK } = await import(
                    chrome.runtime.getURL('sdk/index.js')
                );
                this._sdk = new VFaceSDK({
                    registryUrl: config.registryUrl || REGISTRY_URL,
                    ...config,
                });
                await this._sdk.init();
                this.ready = true;
                return this._sdk;
            } catch (err) {
                console.error('[V-Face] SDK initialization failed:', err);
                throw err;
            }
        },

        /**
         * Quick verify — searches for a matching face.
         * @param {HTMLImageElement|HTMLCanvasElement} imageSource
         * @returns {Promise<{matched: boolean, results: Array}>}
         */
        async verify(imageSource) {
            const sdk = await this.init();
            return sdk.search(imageSource);
        },

        /**
         * Quick register — full registration pipeline.
         * @param {HTMLImageElement|HTMLCanvasElement} imageSource
         * @param {string} publicKey
         * @returns {Promise<{success: boolean, fingerprint: string}>}
         */
        async register(imageSource, publicKey) {
            const sdk = await this.init();
            return sdk.register(imageSource, publicKey);
        },

        /**
         * Check liveness of a face image.
         * @param {HTMLImageElement|HTMLCanvasElement} imageSource
         * @returns {Promise<{isLive: boolean, score: number}>}
         */
        async checkLiveness(imageSource) {
            const sdk = await this.init();
            return sdk.checkLiveness(imageSource);
        },
    };

    // Dispatch event so pages know V-Face is available
    window.dispatchEvent(new CustomEvent('vface:ready', { detail: { version: '1.0.0' } }));
    console.log('[V-Face] Extension injected. Use window.vface to interact.');
})();
