import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { VFaceSDK, Registry } from '@v-face/sdk';

const WalletContext = createContext();

export function useWallet() {
    return useContext(WalletContext);
}

// Initialize Registry and SDK with environment variable
const REGISTRY_URL = import.meta.env.VITE_REGISTRY_URL || 'http://localhost:3000';
const MODEL_PATH = import.meta.env.VITE_MODEL_PATH || '/model/mobilefacenet.onnx';

const registry = new Registry(REGISTRY_URL);
const sdk = new VFaceSDK({
    registryUrl: REGISTRY_URL,
    modelPath: MODEL_PATH,
});

export function WalletProvider({ children }) {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [error, setError] = useState(null);

    const connectWallet = async () => {
        setError(null);
        if (typeof window.ethereum !== 'undefined') {
            try {
                const _provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await _provider.send("eth_requestAccounts", []);
                const _signer = await _provider.getSigner();

                setAccount(accounts[0]);
                setProvider(_provider);
                setSigner(_signer);
            } catch (err) {
                console.error(err);
                setError("Failed to connect wallet.");
            }
        } else {
            setError("Please install MetaMask!");
        }
    };

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    // Reload provider/signer if needed
                    const _provider = new ethers.BrowserProvider(window.ethereum);
                    _provider.getSigner().then(setSigner);
                    setProvider(_provider);
                } else {
                    setAccount(null);
                    setSigner(null);
                }
            });
        }
    }, []);

    const value = {
        account,
        provider,
        signer,
        sdk,
        registry,
        connectWallet,
        error,
        isConnected: !!account
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}
