const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying V-Face Registry...\n");

  // Get the contract factory
  const VFaceRegistry = await hre.ethers.getContractFactory("VFaceRegistry");

  // Get signer info
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy the contract
  const faceRegistry = await VFaceRegistry.deploy();
  await faceRegistry.waitForDeployment();
  const address = await faceRegistry.getAddress();

  console.log("✅ VFaceRegistry deployed to:", address);
  console.log("📝 Network:", hre.network.name);
  console.log("⛽ Gas used: ~", (await hre.ethers.provider.getTransactionReceipt(faceRegistry.deploymentTransaction().hash)).gasUsed.toString());

  // Verify contract info
  const version = await faceRegistry.VERSION();
  const totalRegistrations = await faceRegistry.totalRegistrations();

  console.log("\n📊 Contract Info:");
  console.log("   Version:", version);
  console.log("   Total Registrations:", totalRegistrations.toString());

  console.log("\n🔗 Block Explorer:");
  if (hre.network.name === "worldchain") {
    console.log(`   https://worldscan.org/address/${address}`);
  } else if (hre.network.name === "worldchain_sepolia") {
    console.log(`   https://sepolia.worldscan.org/address/${address}`);
  } else if (hre.network.name === "polygon") {
    console.log(`   https://polygonscan.com/address/${address}`);
  }

  console.log("\n✨ Deployment complete!\n");

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    contract: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    version: version,
  };

  fs.writeFileSync(
    `deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployment-" + hre.network.name + ".json");

  // Wait for block confirmations before verifying
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await faceRegistry.deploymentTransaction().wait(5);

    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
      console.log("   You can verify manually later with:");
      console.log(`   npx hardhat verify --network ${hre.network.name} ${address}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
