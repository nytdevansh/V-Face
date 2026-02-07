export class Registry {
    constructor(apiUrl) {
        this.apiUrl = apiUrl || "https://api.v-face.org";
    }

    async register(fingerprint, publicKey) {
        // Implementation in Phase 1b
        console.log(`[Mock] Registering ${fingerprint} for ${publicKey}`);
        return { success: true };
    }

    async check(fingerprint) {
        // Implementation in Phase 1b
        return { exists: false };
    }
}
