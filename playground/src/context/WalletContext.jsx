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

let registry;
let sdk;

try {
    registry = new Registry(REGISTRY_URL);
    sdk = new VFaceSDK({
        registryUrl: REGISTRY_URL,
        modelPath: MODEL_PATH,
    });
} catch (err) {
    console.error("Failed to initialize Registry/SDK:", err);
}

export function WalletProvider({ children }) {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    // Auto-connect on mount
    useEffect(() => {
        const autoConnect = async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const _provider = new ethers.BrowserProvider(window.ethereum);
                    const accounts = await _provider.listAccounts();
                    if (accounts.length > 0) {
                        const connectedAccount = accounts[0].address || accounts[0];
                        setAccount(connectedAccount);
                        setProvider(_provider);
                        setIsConnected(true);
                        
                        const _signer = await _provider.getSigner();
                        setSigner(_signer);
                    }
                } catch (err) {
                    console.error("Auto-connection error:", err);
                }
            }
        };

        autoConnect();
    }, []);

    const connectWallet = async () => {
        setError(null);
        setIsConnecting(true);

        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error("MetaMask is not installed. Please install it to continue.");
            }

            const _provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await _provider.send("eth_requestAccounts", []);

            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts found. Please check your wallet.");
            }

            const connectedAccount = accounts[0];
            setAccount(connectedAccount);
            setProvider(_provider);
            setIsConnected(true);

            const _signer = await _provider.getSigner();
            setSigner(_signer);
            setError(null);
        } catch (err) {
            console.error("Wallet connection error:", err);

            if (err.code === 4001) {
                setError("Connection rejected. Please try again.");
            } else if (err.code === -32002) {
                setError("Connection request already pending. Please check MetaMask.");
            } else if (err.message?.includes("not installed")) {
                setError("MetaMask is not installed. Please install it to continue.");
            } else {
                setError(err.message || "Failed to connect wallet. Please try again.");
            }

            setAccount(null);
            setSigner(null);
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    };

    const clearError = () => setError(null);

    useEffect(() => {
        if (typeof window.ethereum !== 'undefined') {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    const newAccount = accounts[0];
                    setAccount(newAccount);
                    setIsConnected(true);
                    setError(null);

                    try {
                        const _provider = new ethers.BrowserProvider(window.ethereum);
                        _provider.getSigner().then(setSigner);
                        setProvider(_provider);
                    } catch (err) {
                        console.error("Error updating signer:", err);
                        setError("Failed to update wallet connection.");
                    }
                } else {
                    setAccount(null);
                    setSigner(null);
                    setIsConnected(false);
                    setError(null);
                }
            };

            const handleChainChanged = () => {
                window.location.reload();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                if (window.ethereum) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                    window.ethereum.removeListener('chainChanged', handleChainChanged);
                }
            };
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
        clearError,
        isConnected,
        isConnecting,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}
