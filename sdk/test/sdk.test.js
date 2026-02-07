const { expect } = require("chai");
const { FaceGuard } = require("../src/FaceGuard");
const { hashEncoding } = require("../src/utils");

// Mock ethers for testing without a full blockchain connection
// In a real integration test, we would connect to Hardhat
describe("FaceGuard SDK", function () {

    describe("Utils", function () {
        it("should hash an encoding correctly", function () {
            const encoding = [0.1, 0.2, 0.3];
            const hash = hashEncoding(encoding);
            expect(hash).to.be.a("string");
            expect(hash.startsWith("0x")).to.be.true;
            expect(hash.length).to.equal(66); // 0x + 64 chars
        });

        it("should throw on invalid encoding", function () {
            expect(() => hashEncoding([])).to.throw("Invalid encoding");
            expect(() => hashEncoding(null)).to.throw("Invalid encoding");
        });
    });

    describe("FaceGuard Class", function () {
        let sdk;

        before(function () {
            sdk = new FaceGuard({ network: "localhost" });
        });

        it("should initialize with default config", function () {
            expect(sdk.network).to.equal("localhost");
            expect(sdk.provider).to.not.be.undefined;
        });

        it("should allow connecting a signer", async function () {
            const mockSigner = {
                getAddress: async () => "0x123...",
                provider: {}
            };
            await sdk.connect(mockSigner);
            expect(sdk.signer).to.equal(mockSigner);
            expect(sdk.contract).to.not.be.undefined;
        });
    });
});
