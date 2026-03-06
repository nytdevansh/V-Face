import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { VFaceSDK, Registry } from "@v-face/sdk";

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

// Initialize the Registry client (HTTP-based, no smart contracts)
const REGISTRY_URL = import.meta.env.VITE_REGISTRY_URL || "http://localhost:3000";
const MODEL_PATH = import.meta.env.VITE_MODEL_PATH || "/model/mobilefacenet.onnx";
const registry = new Registry(REGISTRY_URL);
// Initialize the SDK (biometric pipeline + registry)
const sdk = new VFaceSDK({
    registryUrl: REGISTRY_URL,
    modelPath: MODEL_PATH,
});

export const WalletProvider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [signer, setSigner] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    // Auto-connect if already connected
    useEffect(() => {
        const autoConnect = async () => {
            if (window.ethereum) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const accounts = await provider.listAccounts();
                    if (accounts.length > 0) {
                        handleAccountsChanged(accounts);
                    }
                } catch (err) {
                    console.error("Error checking accounts", err);
                    setError("Failed to check wallet connection");
                }
            }
        };

        autoConnect();

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", handleAccountsChanged);
            window.ethereum.on("chainChanged", () => window.location.reload());
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
            }
        };
    }, []);

    const handleAccountsChanged = async (accounts) => {
        try {
            if (accounts.length === 0) {
                setAccount(null);
                setSigner(null);
                setIsConnected(false);
                setError(null);
            } else {
                const address = accounts[0].address || accounts[0];
                setAccount(address);
                setIsConnected(true);
                setError(null);

                if (window.ethereum) {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const s = await provider.getSigner();
                    setSigner(s);
                }
            }
        } catch (err) {
            console.error("Error handling account change", err);
            setError("Failed to update account information");
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            window.open('https://metamask.io/download/', '_blank');
            setError("MetaMask is not installed. Sending you to the download page...");
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            
            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts found in wallet.");
            }
            
            await handleAccountsChanged(accounts);
        } catch (err) {
            console.error("Error connecting wallet:", err);
            
            if (err.code === 4001) {
                setError("Connection rejected. Please try again.");
            } else if (err.code === -32002) {
                setError("Connection request already pending. Please check MetaMask.");
            } else if (err.message?.includes("not installed")) {
                window.open('https://metamask.io/download/', '_blank');
                setError("MetaMask is not installed. Sending you to the download page...");
            } else {
                setError(err.message || "Failed to connect wallet. Please try again.");
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const clearError = () => setError(null);

    return (
        <WalletContext.Provider
            value={{
                account,
                signer,
                sdk,
                registry,
                connectWallet,
                isConnecting,
                isConnected,
                error,
                clearError,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};
