import { ethers } from "ethers";
import { hashEncoding } from "./utils.js";
import FaceRegistryArtifact from "../../artifacts/contracts/VFaceRegistry.sol/VFaceRegistry.json" with { type: "json" };

const FaceRegistryABI = FaceRegistryArtifact.abi;

// Default addresses (would normally be populated from a config or constants file)
const NETWORKS = {
    mumbai: {
        chainId: 80001,
        address: "TBD" // Placeholder, would need actual deployment address
    },
    polygon: {
        chainId: 137,
        address: "TBD"
    },
    localhost: {
        chainId: 31337,
        address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" // Default Hardhat deployment address
    }
};

export class VFace {
    /**
     * Initialize V-Face SDK
     * @param {Object} config - Configuration object
     * @param {string} config.network - Network name ('mumbai', 'polygon', 'localhost')
     * @param {string} [config.rpcUrl] - Optional RPC URL
     * @param {string} [config.privateKey] - Optional private key for signing (server-side use)
     * @param {Object} [config.provider] - Optional injected provider (e.g. window.ethereum)
     */
    constructor(config = {}) {
        this.network = config.network || "localhost";
        this.contractAddress = config.address || NETWORKS[this.network]?.address;

        if (!this.contractAddress) {
            throw new Error(`Contract address not found for network: ${this.network}`);
        }

        // Initialize Provider
        if (config.provider) {
            this.provider = new ethers.BrowserProvider(config.provider);
        } else if (config.rpcUrl) {
            this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        } else {
            // Default local provider if nothing else specified
            this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        }

        // Initialize Signer if private key provided
        if (config.privateKey) {
            this.signer = new ethers.Wallet(config.privateKey, this.provider);
        }
    }

    /**
     * Connect a signer (e.g. from generic wallet connection)
     * @param {Object} signer - Ethers signer object
     */
    async connect(signer) {
        this.signer = signer;
        this.contract = new ethers.Contract(this.contractAddress, FaceRegistryABI, this.signer);
        return this;
    }

    /**
     * Ensure contract is initialized with a signer or provider
     */
    async _getContract(requireSigner = false) {
        if (this.contract) return this.contract;

        if (requireSigner && !this.signer) {
            // Try to get signer from browser provider if available
            if (this.provider instanceof ethers.BrowserProvider) {
                this.signer = await this.provider.getSigner();
            } else {
                throw new Error("Signer required for this operation. Call connect() first or provide privateKey.");
            }
        }

        const runner = requireSigner ? this.signer : this.provider;
        this.contract = new ethers.Contract(this.contractAddress, FaceRegistryABI, runner);
        return this.contract;
    }

    // ============ Core Functions ============

    /**
     * Register a face encoding
     * @param {Float32Array|number[]} encoding - Face encoding vector
     */
    async register(encoding) {
        const hash = hashEncoding(encoding);
        const contract = await this._getContract(true);
        const tx = await contract.register(hash);
        return tx.wait();
    }

    /**
     * Check if a face is registered
     * @param {Float32Array|number[]|string} input - Encoding vector OR pre-calculated hash
     * @returns {Promise<string>} Owner address (or zero address)
     */
    async checkRegistration(input) {
        let hash;
        if (typeof input === 'string' && input.startsWith('0x')) {
            hash = input;
        } else {
            hash = hashEncoding(input);
        }

        const contract = await this._getContract(false);
        return contract.checkRegistration(hash);
    }

    /**
     * Grant consent to an address
     * @param {Float32Array|number[]} encoding - Face encoding vector
     * @param {string} requesterAddress - Address to grant consent to
     */
    async grantConsent(encoding, requesterAddress) {
        const hash = hashEncoding(encoding);
        const contract = await this._getContract(true);
        const tx = await contract.grantConsent(hash, requesterAddress);
        return tx.wait();
    }

    /**
     * Revoke a registration
     * @param {Float32Array|number[]} encoding - Face encoding vector
     */
    async revoke(encoding) {
        const hash = hashEncoding(encoding);
        const contract = await this._getContract(true);
        const tx = await contract.revoke(hash);
        return tx.wait();
    }

    // ============ Helper Functions ============

    /**
     * Static helper to hash encoding without instance
     */
    static hashEncoding(encoding) {
        return hashEncoding(encoding);
    }
}
