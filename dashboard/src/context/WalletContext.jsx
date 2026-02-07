import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { VFace } from "@v-face/sdk";

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [vFace, setVFace] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    // Initialize FaceGuard SDK
    useEffect(() => {
        const initSdk = async () => {
            // Default to localhost for development, or use env var
            // In production we'd detect network
            const sdk = new VFace({ network: "localhost" });
            setVFace(sdk);

            // Auto-connect if already connected
            if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                try {
                    const accounts = await provider.listAccounts();
                    if (accounts.length > 0) {
                        handleAccountsChanged(accounts);
                    }
                } catch (err) {
                    console.error("Error checking accounts", err);
                }
            }
        };

        initSdk();

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
        if (accounts.length === 0) {
            setAccount(null);
        } else {
            const address = accounts[0].address || accounts[0]; // ethers v6 returns objects or strings depending on method
            setAccount(address);

            // Update SDK with signer
            if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();

                // We need to re-instantiate or connect the signer to the existing SDK instance
                // SDK has a connect() method
                setVFace(prev => {
                    if (prev) {
                        prev.connect(signer);
                        return prev;
                    }
                    const newSdk = new VFace({ network: "localhost" });
                    newSdk.connect(signer);
                    return newSdk;
                });
            }
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError("MetaMask not installed");
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            await handleAccountsChanged(accounts);
        } catch (err) {
            console.error("Error connecting wallet", err);
            setError(err.message || "Failed to connect");
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <WalletContext.Provider
            value={{
                account,
                vFace,
                connectWallet,
                isConnecting,
                error,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};
