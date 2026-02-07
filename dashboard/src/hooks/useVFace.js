import { useWallet } from "../context/WalletContext";

export const useVFace = () => {
    const { vFace, account } = useWallet();

    const registerFace = async (encoding) => {
        if (!vFace || !account) throw new Error("Wallet not connected");
        return vFace.register(encoding);
    };

    const checkRegistration = async (input) => {
        if (!vFace) throw new Error("SDK not initialized");
        return vFace.checkRegistration(input);
    };

    const extractEncoding = async (imageInput) => {
        // Re-exporting static helper or instance method if we add one to SDK
        // For now, importing from SDK directly in components might be easier for static imports, 
        // but let's wrap it if we added it to SDK class instance or export
        // SDK exports 'extractFaceEncoding' separately. 
        // We'll import it here to unify the hook surface.
        const { extractFaceEncoding } = await import("@v-face/sdk");
        return extractFaceEncoding(imageInput);
    };

    return {
        registerFace,
        checkRegistration,
        extractEncoding,
        sdk: vFace
    };
};
