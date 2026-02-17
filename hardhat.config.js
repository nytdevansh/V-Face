require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local development
    hardhat: {
      chainId: 31337,
    },

    // World Chain Mainnet
    worldchain: {
      url: process.env.WORLDCHAIN_RPC_URL || "https://worldchain-mainnet.g.alchemy.com/v2/oHKQAgyOJxRkGsNzaV68K",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 480,
    },

    // World Chain Sepolia Testnet (FREE)
    worldchain_sepolia: {
      url: process.env.WORLDCHAIN_TESTNET_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/v2/oHKQAgyOJxRkGsNzaV68K",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 4801,
    },

    // Polygon Mainnet (alternative)
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: {
      worldchain: process.env.WORLDSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "worldchain",
        chainId: 480,
        urls: {
          apiURL: "https://api.worldscan.org/api",
          browserURL: "https://worldscan.org",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
