import { useWallet } from "../context/WalletContext";

export const useVFace = () => {
    const { sdk, registry, account, signer } = useWallet();

    /**
     * Register a face descriptor via the unified SDK pipeline.
     * face-api.js descriptor → embedding → fingerprint → server registration.
     */
    const registerFace = async (faceDescriptor) => {
        if (!sdk || !account) throw new Error("Wallet not connected");

        // face-api.js gives a Float32Array descriptor — we need an image for the SDK.
        // Since FaceScanner already extracts the descriptor, we register directly via Registry.
        const { generateFingerprint } = await import("@v-face/sdk");
        const fingerprint = await generateFingerprint(faceDescriptor);
        const embeddingJson = JSON.stringify(Array.from(faceDescriptor));

        // Sign the registration intent
        const message = `Register Identity: ${fingerprint}`;
        const signature = await signer.signMessage(message);

        return registry.register(fingerprint, account, embeddingJson, {
            source: "dashboard_webcam",
            signature,
            message,
        });
    };

    /**
     * Check if a face descriptor has a matching identity (similarity search).
     */
    const checkRegistration = async (faceDescriptor) => {
        if (!registry) throw new Error("SDK not initialized");

        // Use similarity search via Registry
        const results = await registry.search(Array.from(faceDescriptor), 0.85);

        if (results.matches && results.matches.length > 0) {
            const best = results.matches[0];
            return {
                exists: true,
                confidence: best.similarity,
                hash: best.fingerprint,
            };
        }

        return { exists: false, confidence: 0, hash: null };
    };

    return {
        registerFace,
        checkRegistration,
        sdk,
        registry,
    };
};
