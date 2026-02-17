// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

/**
 * @title V-Face Registry
 * @author V-Face Protocol Contributors
 * @notice Open protocol for privacy-preserving biometric consent management
 * @dev Stores opaque commitments (SHA256 of encrypted biometric data || nonce).
 *      No raw biometric data or deterministic biometric hashes touch the chain.
 * 
 * Architecture (Hybrid Model):
 *   Client → encrypt(embedding) → Server stores encrypted blob
 *   Server → commitment = SHA256(encrypted_blob || nonce) → On-chain anchor
 * 
 * Security considerations:
 * - Only opaque commitments are stored (never biometric data or biometric-derived hashes)
 * - Commitments are unlinkable: same face + different nonce → different commitment
 * - Owner can revoke registration at any time (right to be forgotten)
 * - First registration wins (prevents commitment hijacking)
 * - All actions emit events for transparency and auditability
 */
contract VFaceRegistry {
    
    // ============ State Variables ============
    
    /// @notice Protocol version
    string public constant VERSION = "2.0.0";
    
    /// @notice Registration data structure
    struct Registration {
        address owner;        // Wallet that owns this identity (20 bytes)
        uint88 timestamp;     // When registered (11 bytes, max year ~3M+)
        bool revoked;         // Can be revoked by owner (1 byte)
        // commitment is the key of the mapping, not stored in struct
        // Total: 32 bytes (1 storage slot)
    }
    
    /// @notice Mapping of commitment to registration
    mapping(bytes32 => Registration) public registry;
    
    /// @notice Mapping of owner to their commitments
    mapping(address => bytes32[]) public ownerRegistrations;
    
    /// @notice Total number of active registrations
    uint256 public totalRegistrations;
    
    // ============ Events ============
    
    /**
     * @notice Emitted when a new identity commitment is registered
     * @param owner Wallet address of the owner
     * @param commitment Opaque commitment hash (SHA256 of encrypted blob || nonce)
     * @param timestamp When the registration occurred
     */
    event IdentityRegistered(
        address indexed owner,
        bytes32 indexed commitment,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when consent is granted
     * @param owner Owner of the identity
     * @param requester Who is requesting to use the identity
     * @param commitment Which identity commitment
     * @param timestamp When consent was granted
     */
    event ConsentGranted(
        address indexed owner,
        address indexed requester,
        bytes32 indexed commitment,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a registration is revoked
     * @param owner Owner who revoked
     * @param commitment Which identity commitment was revoked
     * @param timestamp When revoked
     */
    event RegistrationRevoked(
        address indexed owner,
        bytes32 indexed commitment,
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error AlreadyRegistered(bytes32 commitment, address owner);
    error NotRegistered(bytes32 commitment);
    error NotOwner(address caller, address owner);
    error AlreadyRevoked(bytes32 commitment);
    error ZeroCommitment();
    
    // ============ Modifiers ============
    
    modifier validCommitment(bytes32 _commitment) {
        if (_commitment == bytes32(0)) revert ZeroCommitment();
        _;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Register an identity commitment
     * @param _commitment Opaque commitment = SHA256(encrypted_embedding || nonce)
     * @dev First registration wins. Cannot re-register same commitment.
     * 
     * The commitment is computed off-chain by the server:
     *   1. Client sends face image → SDK extracts embedding
     *   2. Server encrypts embedding with AES-256-GCM
     *   3. Server generates random nonce (32 bytes)
     *   4. commitment = SHA256(encrypted_blob || nonce)
     *   5. Server or client submits commitment on-chain
     * 
     * This ensures the on-chain value is:
     *   - Opaque (cannot derive biometric data)
     *   - Unlinkable (same face → different commitments with different nonces)
     *   - Tamper-evident (changing encrypted blob invalidates commitment)
     */
    function register(bytes32 _commitment) 
        external 
        validCommitment(_commitment)
    {
        // Check if already registered
        if (registry[_commitment].owner != address(0)) {
            revert AlreadyRegistered(_commitment, registry[_commitment].owner);
        }
        
        // Create registration
        registry[_commitment] = Registration({
            owner: msg.sender,
            timestamp: uint88(block.timestamp),
            revoked: false
        });
        
        // Track owner's registrations
        ownerRegistrations[msg.sender].push(_commitment);
        
        // Increment counter
        totalRegistrations++;
        
        // Emit event
        emit IdentityRegistered(msg.sender, _commitment, block.timestamp);
    }
    
    /**
     * @notice Check if a commitment is registered
     * @param _commitment Commitment to check
     * @return owner Address of the owner (address(0) if not registered or revoked)
     * @dev This is a view function - FREE to call (no gas)
     */
    function checkRegistration(bytes32 _commitment) 
        external 
        view 
        validCommitment(_commitment)
        returns (address owner) 
    {
        Registration memory reg = registry[_commitment];
        
        // Return address(0) if not registered or revoked
        if (reg.owner == address(0) || reg.revoked) {
            return address(0);
        }
        
        return reg.owner;
    }
    
    /**
     * @notice Grant consent for someone to use your identity
     * @param _commitment Your identity commitment
     * @param _requester Who is requesting consent
     * @dev Emits event that can be verified off-chain
     */
    function grantConsent(bytes32 _commitment, address _requester) 
        external 
        validCommitment(_commitment)
    {
        Registration memory reg = registry[_commitment];
        
        // Verify ownership
        if (reg.owner != msg.sender) {
            revert NotOwner(msg.sender, reg.owner);
        }
        
        // Verify not revoked
        if (reg.revoked) {
            revert AlreadyRevoked(_commitment);
        }
        
        // Emit consent event
        emit ConsentGranted(
            msg.sender, 
            _requester, 
            _commitment, 
            block.timestamp
        );
    }
    
    /**
     * @notice Revoke your identity registration (right to be forgotten)
     * @param _commitment Your identity commitment to revoke
     * @dev Marks registration as revoked (doesn't delete for audit trail).
     *      Off-chain: server should also delete encrypted embedding data.
     */
    function revoke(bytes32 _commitment) 
        external 
        validCommitment(_commitment)
    {
        Registration storage reg = registry[_commitment];
        
        // Verify ownership
        if (reg.owner != msg.sender) {
            revert NotOwner(msg.sender, reg.owner);
        }
        
        // Verify not already revoked
        if (reg.revoked) {
            revert AlreadyRevoked(_commitment);
        }
        
        // Mark as revoked
        reg.revoked = true;
        
        // Decrement counter
        totalRegistrations--;
        
        // Emit event
        emit RegistrationRevoked(msg.sender, _commitment, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get all commitments for an owner
     * @param _owner Address to query
     * @return Array of commitments owned by this address
     */
    function getOwnerRegistrations(address _owner) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return ownerRegistrations[_owner];
    }
    
    /**
     * @notice Get full registration details
     * @param _commitment Commitment to query
     * @return owner Owner address
     * @return timestamp When registered
     * @return revoked Whether it's been revoked
     */
    function getRegistration(bytes32 _commitment) 
        external 
        view 
        returns (
            address owner,
            uint256 timestamp,
            bool revoked
        ) 
    {
        Registration memory reg = registry[_commitment];
        return (reg.owner, reg.timestamp, reg.revoked);
    }
    
    /**
     * @notice Check if an identity is registered and active
     * @param _commitment Commitment to check
     * @return True if registered and not revoked
     */
    function isActive(bytes32 _commitment) 
        external 
        view 
        returns (bool) 
    {
        Registration memory reg = registry[_commitment];
        return reg.owner != address(0) && !reg.revoked;
    }
}
