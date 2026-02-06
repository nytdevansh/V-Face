// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

/**
 * @title FaceGuard Registry
 * @author FaceGuard Protocol Contributors
 * @notice Open protocol for biometric consent management
 * @dev Stores hashed face encodings mapped to wallet addresses
 * 
 * Security considerations:
 * - Only hashes are stored (never raw biometric data)
 * - Owner can revoke registration at any time
 * - First registration wins (prevents hijacking)
 * - All actions emit events for transparency
 */
contract FaceRegistry {
    
    // ============ State Variables ============
    
    /// @notice Protocol version
    string public constant VERSION = "1.0.0";
    
    /// @notice Registration data structure
    struct Registration {
        address owner;        // Wallet that owns this face (20 bytes)
        uint88 timestamp;     // When registered (11 bytes, max year ~3M+)
        bool revoked;         // Can be revoked by owner (1 byte)
        // encodingHash is removed as it's the key of the mapping
        // Total: 32 bytes (1 storage slot)
    }
    
    /// @notice Mapping of encoding hash to registration
    mapping(bytes32 => Registration) public registry;
    
    /// @notice Mapping of owner to their registered hashes
    mapping(address => bytes32[]) public ownerRegistrations;
    
    /// @notice Total number of active registrations
    uint256 public totalRegistrations;
    
    // ============ Events ============
    
    /**
     * @notice Emitted when a new face is registered
     * @param owner Wallet address of the owner
     * @param encodingHash Hash of the face encoding
     * @param timestamp When the registration occurred
     */
    event FaceRegistered(
        address indexed owner,
        bytes32 indexed encodingHash,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when consent is granted
     * @param owner Owner of the face
     * @param requester Who is requesting to use the face
     * @param encodingHash Which face encoding
     * @param timestamp When consent was granted
     */
    event ConsentGranted(
        address indexed owner,
        address indexed requester,
        bytes32 indexed encodingHash,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a registration is revoked
     * @param owner Owner who revoked
     * @param encodingHash Which face was revoked
     * @param timestamp When revoked
     */
    event RegistrationRevoked(
        address indexed owner,
        bytes32 indexed encodingHash,
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error AlreadyRegistered(bytes32 encodingHash, address owner);
    error NotRegistered(bytes32 encodingHash);
    error NotOwner(address caller, address owner);
    error AlreadyRevoked(bytes32 encodingHash);
    error ZeroHash();
    
    // ============ Modifiers ============
    
    modifier validHash(bytes32 _hash) {
        if (_hash == bytes32(0)) revert ZeroHash();
        _;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Register a face encoding hash
     * @param _encodingHash SHA256 hash of the face encoding (128-d vector)
     * @dev First registration wins. Cannot re-register same hash.
     * 
     * Example:
     *   const encoding = await extractFaceEncoding(photo);
     *   const hash = sha256(encoding.toString());
     *   await contract.register(hash);
     */
    function register(bytes32 _encodingHash) 
        external 
        validHash(_encodingHash)
    {
        // Check if already registered
        if (registry[_encodingHash].owner != address(0)) {
            revert AlreadyRegistered(_encodingHash, registry[_encodingHash].owner);
        }
        
        // Create registration
        registry[_encodingHash] = Registration({
            owner: msg.sender,
            timestamp: uint88(block.timestamp),
            revoked: false
        });
        
        // Track owner's registrations
        ownerRegistrations[msg.sender].push(_encodingHash);
        
        // Increment counter
        totalRegistrations++;
        
        // Emit event
        emit FaceRegistered(msg.sender, _encodingHash, block.timestamp);
    }
    
    /**
     * @notice Check if a face encoding is registered
     * @param _encodingHash Hash to check
     * @return owner Address of the owner (address(0) if not registered or revoked)
     * @dev This is a view function - FREE to call (no gas)
     * 
     * Example:
     *   const owner = await contract.checkRegistration(hash);
     *   if (owner !== "0x0000...") {
     *     // Face is registered!
     *   }
     */
    function checkRegistration(bytes32 _encodingHash) 
        external 
        view 
        validHash(_encodingHash)
        returns (address owner) 
    {
        Registration memory reg = registry[_encodingHash];
        
        // Return address(0) if not registered or revoked
        if (reg.owner == address(0) || reg.revoked) {
            return address(0);
        }
        
        return reg.owner;
    }
    
    /**
     * @notice Grant consent for someone to use your face
     * @param _encodingHash Your face encoding hash
     * @param _requester Who is requesting consent
     * @dev Emits event that can be verified off-chain
     * 
     * Example use case:
     *   AI service wants to use your face → you grant consent on-chain
     *   Service verifies consent by checking event logs
     */
    function grantConsent(bytes32 _encodingHash, address _requester) 
        external 
        validHash(_encodingHash)
    {
        Registration memory reg = registry[_encodingHash];
        
        // Verify ownership
        if (reg.owner != msg.sender) {
            revert NotOwner(msg.sender, reg.owner);
        }
        
        // Verify not revoked
        if (reg.revoked) {
            revert AlreadyRevoked(_encodingHash);
        }
        
        // Emit consent event
        emit ConsentGranted(
            msg.sender, 
            _requester, 
            _encodingHash, 
            block.timestamp
        );
    }
    
    /**
     * @notice Revoke your face registration (right to be forgotten)
     * @param _encodingHash Your face encoding hash to revoke
     * @dev Marks registration as revoked (doesn't delete for audit trail)
     * 
     * Example:
     *   User wants to remove their face from the registry
     *   await contract.revoke(hash);
     */
    function revoke(bytes32 _encodingHash) 
        external 
        validHash(_encodingHash)
    {
        Registration storage reg = registry[_encodingHash];
        
        // Verify ownership
        if (reg.owner != msg.sender) {
            revert NotOwner(msg.sender, reg.owner);
        }
        
        // Verify not already revoked
        if (reg.revoked) {
            revert AlreadyRevoked(_encodingHash);
        }
        
        // Mark as revoked
        reg.revoked = true;
        
        // Decrement counter
        totalRegistrations--;
        
        // Emit event
        emit RegistrationRevoked(msg.sender, _encodingHash, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get all registrations for an owner
     * @param _owner Address to query
     * @return Array of encoding hashes owned by this address
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
     * @param _encodingHash Hash to query
     * @return owner Owner address
     * @return timestamp When registered
     * @return revoked Whether it's been revoked
     */
    function getRegistration(bytes32 _encodingHash) 
        external 
        view 
        returns (
            address owner,
            uint256 timestamp,
            bool revoked
        ) 
    {
        Registration memory reg = registry[_encodingHash];
        return (reg.owner, reg.timestamp, reg.revoked);
    }
    
    /**
     * @notice Check if a face is registered and active
     * @param _encodingHash Hash to check
     * @return True if registered and not revoked
     */
    function isActive(bytes32 _encodingHash) 
        external 
        view 
        returns (bool) 
    {
        Registration memory reg = registry[_encodingHash];
        return reg.owner != address(0) && !reg.revoked;
    }
}
