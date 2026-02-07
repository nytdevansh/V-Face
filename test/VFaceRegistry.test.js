const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFaceRegistry", function () {
  let VFaceRegistry;
  let faceRegistry;
  let owner;
  let alice;
  let bob;
  let aiService;

  // Sample face encoding hashes (in real usage, these come from SHA256(face_encoding))
  const aliceHash = ethers.keccak256(ethers.toUtf8Bytes("alice_face_encoding_128d"));
  const bobHash = ethers.keccak256(ethers.toUtf8Bytes("bob_face_encoding_128d"));
  const charlieHash = ethers.keccak256(ethers.toUtf8Bytes("charlie_face_encoding_128d"));

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
      expect(await faceRegistry.VERSION()).to.equal("1.0.0");
    });

    it("Should start with zero registrations", async function () {
      expect(await faceRegistry.totalRegistrations()).to.equal(0);
    });
  });

  describe("Registration", function () {
    it("Should allow a user to register their face", async function () {
      const tx = await faceRegistry.connect(alice).register(aliceHash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(faceRegistry, "FaceRegistered")
        .withArgs(alice.address, aliceHash, block.timestamp);

      expect(await faceRegistry.totalRegistrations()).to.equal(1);
      expect(await faceRegistry.checkRegistration(aliceHash)).to.equal(alice.address);
    });

    it("Should prevent registering the same hash twice", async function () {
      await faceRegistry.connect(alice).register(aliceHash);

      await expect(
        faceRegistry.connect(bob).register(aliceHash)
      ).to.be.revertedWithCustomError(faceRegistry, "AlreadyRegistered");
    });

    it("Should prevent registering zero hash", async function () {
      const zeroHash = ethers.ZeroHash;

      await expect(
        faceRegistry.connect(alice).register(zeroHash)
      ).to.be.revertedWithCustomError(faceRegistry, "ZeroHash");
    });

    it("Should allow multiple registrations by the same user", async function () {
      await faceRegistry.connect(alice).register(aliceHash);
      await faceRegistry.connect(alice).register(charlieHash);

      expect(await faceRegistry.totalRegistrations()).to.equal(2);

      const aliceRegistrations = await faceRegistry.getOwnerRegistrations(alice.address);
      expect(aliceRegistrations.length).to.equal(2);
      expect(aliceRegistrations[0]).to.equal(aliceHash);
      expect(aliceRegistrations[1]).to.equal(charlieHash);
    });

    it("Should track owner registrations correctly", async function () {
      await faceRegistry.connect(alice).register(aliceHash);
      await faceRegistry.connect(bob).register(bobHash);

      const aliceRegs = await faceRegistry.getOwnerRegistrations(alice.address);
      const bobRegs = await faceRegistry.getOwnerRegistrations(bob.address);

      expect(aliceRegs.length).to.equal(1);
      expect(bobRegs.length).to.equal(1);
      expect(aliceRegs[0]).to.equal(aliceHash);
      expect(bobRegs[0]).to.equal(bobHash);
    });
  });

  describe("Checking Registration", function () {
    beforeEach(async function () {
      await faceRegistry.connect(alice).register(aliceHash);
    });

    it("Should return correct owner for registered hash", async function () {
      expect(await faceRegistry.checkRegistration(aliceHash)).to.equal(alice.address);
    });

    it("Should return zero address for unregistered hash", async function () {
      expect(await faceRegistry.checkRegistration(bobHash)).to.equal(ethers.ZeroAddress);
    });

    it("Should return full registration details", async function () {
      const [owner, timestamp, revoked] = await faceRegistry.getRegistration(aliceHash);

      expect(owner).to.equal(alice.address);
      expect(timestamp).to.be.gt(0);
      expect(revoked).to.be.false;
    });

    it("Should correctly report active status", async function () {
      expect(await faceRegistry.isActive(aliceHash)).to.be.true;
      expect(await faceRegistry.isActive(bobHash)).to.be.false;
    });
  });

  describe("Consent Management", function () {
    beforeEach(async function () {
      await faceRegistry.connect(alice).register(aliceHash);
    });

    it("Should allow owner to grant consent", async function () {
      const tx = await faceRegistry.connect(alice).grantConsent(aliceHash, aiService.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(faceRegistry, "ConsentGranted")
        .withArgs(alice.address, aiService.address, aliceHash, block.timestamp);
    });

    it("Should prevent non-owner from granting consent", async function () {
      await expect(
        faceRegistry.connect(bob).grantConsent(aliceHash, aiService.address)
      ).to.be.revertedWithCustomError(faceRegistry, "NotOwner");
    });

    it("Should prevent granting consent for revoked registration", async function () {
      await faceRegistry.connect(alice).revoke(aliceHash);

      await expect(
        faceRegistry.connect(alice).grantConsent(aliceHash, aiService.address)
      ).to.be.revertedWithCustomError(faceRegistry, "AlreadyRevoked");
    });

    it("Should allow granting consent multiple times", async function () {
      await faceRegistry.connect(alice).grantConsent(aliceHash, aiService.address);
      await faceRegistry.connect(alice).grantConsent(aliceHash, bob.address);

      // Both should succeed (events are emitted for off-chain verification)
    });
  });

  describe("Revocation", function () {
    beforeEach(async function () {
      await faceRegistry.connect(alice).register(aliceHash);
    });

    it("Should allow owner to revoke registration", async function () {
      expect(await faceRegistry.totalRegistrations()).to.equal(1);

      const tx = await faceRegistry.connect(alice).revoke(aliceHash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(faceRegistry, "RegistrationRevoked")
        .withArgs(alice.address, aliceHash, block.timestamp);

      expect(await faceRegistry.totalRegistrations()).to.equal(0);
    });

    it("Should prevent non-owner from revoking", async function () {
      await expect(
        faceRegistry.connect(bob).revoke(aliceHash)
      ).to.be.revertedWithCustomError(faceRegistry, "NotOwner");
    });

    it("Should prevent double revocation", async function () {
      await faceRegistry.connect(alice).revoke(aliceHash);

      await expect(
        faceRegistry.connect(alice).revoke(aliceHash)
      ).to.be.revertedWithCustomError(faceRegistry, "AlreadyRevoked");
    });

    it("Should make checkRegistration return zero address after revocation", async function () {
      await faceRegistry.connect(alice).revoke(aliceHash);

      expect(await faceRegistry.checkRegistration(aliceHash)).to.equal(ethers.ZeroAddress);
    });

    it("Should make isActive return false after revocation", async function () {
      expect(await faceRegistry.isActive(aliceHash)).to.be.true;

      await faceRegistry.connect(alice).revoke(aliceHash);

      expect(await faceRegistry.isActive(aliceHash)).to.be.false;
    });

    it("Should preserve registration data after revocation", async function () {
      await faceRegistry.connect(alice).revoke(aliceHash);

      const [owner, timestamp, revoked] = await faceRegistry.getRegistration(aliceHash);

      expect(owner).to.equal(alice.address);
      expect(timestamp).to.be.gt(0);
      expect(revoked).to.be.true;
    });
  });

  describe("Real-World Scenario: AI Service Integration", function () {
    it("Should handle complete workflow", async function () {
      // Step 1: Alice registers her face
      await faceRegistry.connect(alice).register(aliceHash);
      console.log("      ✓ Alice registered her face");

      // Step 2: AI service checks if face is registered
      const owner = await faceRegistry.checkRegistration(aliceHash);
      expect(owner).to.equal(alice.address);
      console.log("      ✓ AI service detected face is registered to Alice");

      // Step 3: Bob tries to use Alice's face → should be detected
      expect(owner).to.not.equal(bob.address);
      console.log("      ✓ System detected Bob is not the owner");

      // Step 4: Alice grants consent to the AI service
      await faceRegistry.connect(alice).grantConsent(aliceHash, aiService.address);
      console.log("      ✓ Alice granted consent to AI service");

      // Step 5: Later, Alice revokes her registration
      await faceRegistry.connect(alice).revoke(aliceHash);
      console.log("      ✓ Alice revoked her registration");

      // Step 6: AI service checks again → now returns zero address
      const ownerAfterRevoke = await faceRegistry.checkRegistration(aliceHash);
      expect(ownerAfterRevoke).to.equal(ethers.ZeroAddress);
      console.log("      ✓ Face is no longer active in registry");
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for registration", async function () {
      const tx = await faceRegistry.connect(alice).register(aliceHash);
      const receipt = await tx.wait();

      console.log("      Gas used for registration:", receipt.gasUsed.toString());

      // Should be under 120k gas (optimized)
      expect(receipt.gasUsed).to.be.lt(120000);
    });

    it("Should use minimal gas for checking (view function)", async function () {
      await faceRegistry.connect(alice).register(aliceHash);

      // View functions don't cost gas, but we can estimate
      const gasEstimate = await faceRegistry.checkRegistration.estimateGas(aliceHash);

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
