const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFaceRegistry", function () {
  let VFaceRegistry;
  let faceRegistry;
  let owner;
  let alice;
  let bob;
  let aiService;

  // Sample commitments (in production: SHA256(encrypted_embedding || nonce))
  const aliceCommitment = ethers.keccak256(ethers.toUtf8Bytes("alice_commitment_v2"));
  const bobCommitment = ethers.keccak256(ethers.toUtf8Bytes("bob_commitment_v2"));
  const charlieCommitment = ethers.keccak256(ethers.toUtf8Bytes("charlie_commitment_v2"));

  beforeEach(async function () {
    // Get signers
    [owner, alice, bob, aiService] = await ethers.getSigners();

    // Deploy contract
    VFaceRegistry = await ethers.getContractFactory("VFaceRegistry");
    faceRegistry = await VFaceRegistry.deploy();
    await faceRegistry.waitForDeployment();
  });
  describe("Deployment", function () {
    it("Should set the correct version", async function () {
      expect(await faceRegistry.VERSION()).to.equal("2.0.0");
    });

    it("Should start with zero registrations", async function () {
      expect(await faceRegistry.totalRegistrations()).to.equal(0);
    });
  });

  describe("Registration", function () {
    it("Should allow a user to register a commitment", async function () {
      const tx = await faceRegistry.connect(alice).register(aliceCommitment);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(faceRegistry, "IdentityRegistered")
        .withArgs(alice.address, aliceCommitment, block.timestamp);

      expect(await faceRegistry.totalRegistrations()).to.equal(1);
      expect(await faceRegistry.checkRegistration(aliceCommitment)).to.equal(alice.address);
    });

    it("Should prevent registering the same commitment twice", async function () {
      await faceRegistry.connect(alice).register(aliceCommitment);

      await expect(
        faceRegistry.connect(bob).register(aliceCommitment)
      ).to.be.revertedWithCustomError(faceRegistry, "AlreadyRegistered");
    });

    it("Should prevent registering zero commitment", async function () {
      const zeroHash = ethers.ZeroHash;

      await expect(
        faceRegistry.connect(alice).register(zeroHash)
      ).to.be.revertedWithCustomError(faceRegistry, "ZeroCommitment");
    });

    it("Should allow multiple registrations by the same user", async function () {
      await faceRegistry.connect(alice).register(aliceCommitment);
      await faceRegistry.connect(alice).register(charlieCommitment);

      expect(await faceRegistry.totalRegistrations()).to.equal(2);

      const aliceRegistrations = await faceRegistry.getOwnerRegistrations(alice.address);
      expect(aliceRegistrations.length).to.equal(2);
      expect(aliceRegistrations[0]).to.equal(aliceCommitment);
      expect(aliceRegistrations[1]).to.equal(charlieCommitment);
    });

    it("Should track owner registrations correctly", async function () {
      await faceRegistry.connect(alice).register(aliceCommitment);
      await faceRegistry.connect(bob).register(bobCommitment);

      const aliceRegs = await faceRegistry.getOwnerRegistrations(alice.address);
      const bobRegs = await faceRegistry.getOwnerRegistrations(bob.address);

      expect(aliceRegs.length).to.equal(1);
      expect(bobRegs.length).to.equal(1);
      expect(aliceRegs[0]).to.equal(aliceCommitment);
      expect(bobRegs[0]).to.equal(bobCommitment);
    });

    it("Same biometric with different nonces should produce different commitments", async function () {
      // This simulates the commitment scheme: SHA256(encrypted_blob || nonce)
      // Same "biometric" data but different nonces → different commitments
      const biometricData = "same_encrypted_embedding_blob";
      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes(biometricData + "_nonce_1"));
      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes(biometricData + "_nonce_2"));

      // The commitments should be different (unlinkable)
      expect(commitment1).to.not.equal(commitment2);

      // Both should register successfully — proving the same face can have
      // multiple unlinkable on-chain anchors
      await faceRegistry.connect(alice).register(commitment1);
      await faceRegistry.connect(alice).register(commitment2);

      expect(await faceRegistry.totalRegistrations()).to.equal(2);
      expect(await faceRegistry.checkRegistration(commitment1)).to.equal(alice.address);
      expect(await faceRegistry.checkRegistration(commitment2)).to.equal(alice.address);
    });
  });

  describe("Checking Registration", function () {
    beforeEach(async function () {
      await faceRegistry.connect(alice).register(aliceCommitment);
    });

    it("Should return correct owner for registered commitment", async function () {
      expect(await faceRegistry.checkRegistration(aliceCommitment)).to.equal(alice.address);
    });

    it("Should return zero address for unregistered commitment", async function () {
      expect(await faceRegistry.checkRegistration(bobCommitment)).to.equal(ethers.ZeroAddress);
    });

    it("Should return full registration details", async function () {
      const [owner, timestamp, revoked] = await faceRegistry.getRegistration(aliceCommitment);

      expect(owner).to.equal(alice.address);
      expect(timestamp).to.be.gt(0);
      expect(revoked).to.be.false;
    });

    it("Should correctly report active status", async function () {
      expect(await faceRegistry.isActive(aliceCommitment)).to.be.true;
      expect(await faceRegistry.isActive(bobCommitment)).to.be.false;
    });
  });

  describe("Consent Management", function () {
    beforeEach(async function () {
      await faceRegistry.connect(alice).register(aliceCommitment);
    });

    it("Should allow owner to grant consent", async function () {
      const tx = await faceRegistry.connect(alice).grantConsent(aliceCommitment, aiService.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(faceRegistry, "ConsentGranted")
        .withArgs(alice.address, aiService.address, aliceCommitment, block.timestamp);
    });

    it("Should prevent non-owner from granting consent", async function () {
      await expect(
        faceRegistry.connect(bob).grantConsent(aliceCommitment, aiService.address)
      ).to.be.revertedWithCustomError(faceRegistry, "NotOwner");
    });

    it("Should prevent granting consent for revoked registration", async function () {
      await faceRegistry.connect(alice).revoke(aliceCommitment);

      await expect(
        faceRegistry.connect(alice).grantConsent(aliceCommitment, aiService.address)
      ).to.be.revertedWithCustomError(faceRegistry, "AlreadyRevoked");
    });

    it("Should allow granting consent multiple times", async function () {
      await faceRegistry.connect(alice).grantConsent(aliceCommitment, aiService.address);
      await faceRegistry.connect(alice).grantConsent(aliceCommitment, bob.address);

      // Both should succeed (events are emitted for off-chain verification)
    });
  });

  describe("Revocation", function () {
    beforeEach(async function () {
      await faceRegistry.connect(alice).register(aliceCommitment);
    });

    it("Should allow owner to revoke registration", async function () {
      expect(await faceRegistry.totalRegistrations()).to.equal(1);

      const tx = await faceRegistry.connect(alice).revoke(aliceCommitment);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(faceRegistry, "RegistrationRevoked")
        .withArgs(alice.address, aliceCommitment, block.timestamp);

      expect(await faceRegistry.totalRegistrations()).to.equal(0);
    });

    it("Should prevent non-owner from revoking", async function () {
      await expect(
        faceRegistry.connect(bob).revoke(aliceCommitment)
      ).to.be.revertedWithCustomError(faceRegistry, "NotOwner");
    });

    it("Should prevent double revocation", async function () {
      await faceRegistry.connect(alice).revoke(aliceCommitment);

      await expect(
        faceRegistry.connect(alice).revoke(aliceCommitment)
      ).to.be.revertedWithCustomError(faceRegistry, "AlreadyRevoked");
    });

    it("Should make checkRegistration return zero address after revocation", async function () {
      await faceRegistry.connect(alice).revoke(aliceCommitment);

      expect(await faceRegistry.checkRegistration(aliceCommitment)).to.equal(ethers.ZeroAddress);
    });

    it("Should make isActive return false after revocation", async function () {
      expect(await faceRegistry.isActive(aliceCommitment)).to.be.true;

      await faceRegistry.connect(alice).revoke(aliceCommitment);

      expect(await faceRegistry.isActive(aliceCommitment)).to.be.false;
    });

    it("Should preserve registration data after revocation", async function () {
      await faceRegistry.connect(alice).revoke(aliceCommitment);

      const [owner, timestamp, revoked] = await faceRegistry.getRegistration(aliceCommitment);

      expect(owner).to.equal(alice.address);
      expect(timestamp).to.be.gt(0);
      expect(revoked).to.be.true;
    });
  });

  describe("Real-World Scenario: AI Service Integration", function () {
    it("Should handle complete workflow", async function () {
      // Step 1: Alice registers her identity commitment
      await faceRegistry.connect(alice).register(aliceCommitment);
      console.log("      ✓ Alice registered her identity commitment");

      // Step 2: AI service checks if commitment is registered
      const owner = await faceRegistry.checkRegistration(aliceCommitment);
      expect(owner).to.equal(alice.address);
      console.log("      ✓ AI service detected commitment is registered to Alice");

      // Step 3: Bob tries to claim Alice's commitment → should be detected
      expect(owner).to.not.equal(bob.address);
      console.log("      ✓ System detected Bob is not the owner");

      // Step 4: Alice grants consent to the AI service
      await faceRegistry.connect(alice).grantConsent(aliceCommitment, aiService.address);
      console.log("      ✓ Alice granted consent to AI service");

      // Step 5: Later, Alice revokes her registration
      await faceRegistry.connect(alice).revoke(aliceCommitment);
      console.log("      ✓ Alice revoked her registration");

      // Step 6: AI service checks again → now returns zero address
      const ownerAfterRevoke = await faceRegistry.checkRegistration(aliceCommitment);
      expect(ownerAfterRevoke).to.equal(ethers.ZeroAddress);
      console.log("      ✓ Identity is no longer active in registry");
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for registration", async function () {
      const tx = await faceRegistry.connect(alice).register(aliceCommitment);
      const receipt = await tx.wait();

      console.log("      Gas used for registration:", receipt.gasUsed.toString());

      // Should be under 120k gas (optimized)
      expect(receipt.gasUsed).to.be.lt(120000);
    });

    it("Should use minimal gas for checking (view function)", async function () {
      await faceRegistry.connect(alice).register(aliceCommitment);

      // View functions don't cost gas, but we can estimate
      const gasEstimate = await faceRegistry.checkRegistration.estimateGas(aliceCommitment);

      console.log("      Gas estimate for checking:", gasEstimate.toString());

      // Should be very cheap (view function)
      expect(gasEstimate).to.be.lt(50000);
    });
  });

  // Helper function to get block timestamp
  async function getBlockTimestamp() {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    return block.timestamp;
  }
});
