# Changelog

All notable changes to the V-Face SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha] - 2024-02-18

### Added

#### Core SDK Features
- **VFaceSDK Class**: Unified API for biometric identity and consent management
  - `init()` - Initialize SDK and load face embedding model
  - `getFingerprint()` - Generate deterministic 64-char fingerprint from face
  - `getRawEmbedding()` - Extract 128-d embedding vector
  - `register()` - Full registration pipeline
  - `check()` - Verify registration status
  - `search()` - Find similar faces in registry
  - `revoke()` - Revoke identity with signed proof
  - `requestConsent()` - Request consent from user
  - `approveConsent()` - Approve pending consent request
  - `verifyToken()` - Verify consent JWT token

#### Core Modules
- **Embedding Pipeline** (`embedding/pipeline.js`)
  - MobileFaceNet ONNX model support
  - Face image preprocessing and normalization
  - 128-dimensional embedding extraction
  - Browser and Node.js compatibility
  - Model file validation

- **Fingerprint Generator** (`fingerprint/index.js`)
  - Deterministic fingerprint generation
  - Optional salt for per-service unlinkability
  - L2 normalization and quantization
  - SHA-256 hashing with browser/Node.js support

- **Registry API Client** (`registry/index.js`)
  - HTTP client for V-Face Registry API
  - Complete API endpoint coverage
  - Custom error handling with status codes
  - Automatic error message extraction

#### Utilities
- **Setup Helper** (`setup.js`)
  - `setupSDK()` - Easy SDK initialization with defaults
  - `validateSDKSetup()` - Pre-deployment validation
  - `createTestEmbedding()` - Deterministic test data
  - Environment variable support

- **Cosine Similarity** - Vector similarity computation

#### Type Definitions
- Complete TypeScript definitions (`.d.ts` files)
- Main SDK: `index.d.ts`
- Embedding: `embedding/pipeline.d.ts`
- Fingerprint: `fingerprint/index.d.ts`
- Registry: `registry/index.d.ts`
- Setup: `setup.d.ts`

#### Documentation
- **README.md** - Comprehensive API documentation with examples
  - Installation instructions
  - Quick start guides (browser and Node.js)
  - Complete API reference
  - Usage examples
  - Error handling guide
  - Deployment instructions

- **DEPLOYMENT.md** - Complete deployment checklist
  - Environment configuration
  - Model preparation
  - Testing procedures
  - Security review checklist
  - Production deployment steps
  - Post-deployment verification

- **CONTRIBUTING.md** - Developer guidelines
  - Development setup
  - Code style guidelines
  - Testing requirements
  - PR process
  - Commit message format
  - Documentation standards

- **CHANGELOG.md** - This file

#### Build Configuration
- **vite.config.js** - Browser bundle configuration
  - ES and UMD format support
  - Source maps generation
  - Tree-shaking optimization
  - External dependency handling

#### Package Configuration
- **package.json** updates
  - Proper `exports` field for ES modules
  - `files` array for npm distribution
  - Build scripts (`build`, `build:types`)
  - Updated scripts (test:integration)
  - Node.js 16+ engine requirement
  - Optional dependency handling

- **.npmignore** - NPM package distribution rules
  - Excludes test and build artifacts
  - Excludes development files
  - Excludes documentation guides

### Changed

#### Core Changes
- **Canvas Handling**: Fixed compatibility for both browser and Node.js environments
  - Detects `window` object for browser
  - Uses `canvas` library in Node.js
  - Supports both HTMLImageElement and Canvas input
  - Handles ImageData objects

- **Environment Detection**: Improved detection for browser vs Node.js
  - Model loading from file in Node.js
  - Model loading from URL in browser
  - Proper error messages for environment-specific issues

#### Dependencies
- Made `canvas` and `face-api.js` optional dependencies
- Added `vite` for browser bundling
- Added `typescript` for type checking
- Updated dev dependencies for build tooling

### Fixed

- Canvas API compatibility in Node.js environments
- Model file size validation to prevent stub attacks
- Memory handling in image preprocessing
- Error messages leak-free (no sensitive data)

### Deprecated

- None in alpha version

### Removed

- None in alpha version

### Security

- Added model file size validation (minimum 1MB)
- Sanitized error messages to prevent data leaks
- Secure hash generation with environment detection
- No sensitive data in console output

## Future Releases

### Planned for v0.2.0
- Browser bundle optimization
- Additional test coverage
- Performance benchmarking
- Extended consent scope options
- Rate limiting in registry client

### Planned for v0.3.0
- Face detection before embedding
- Multi-factor consent support
- Batch registration API
- Advanced search filters
- Audit logging

### Planned for v1.0.0
- Stable API guarantee
- Production-ready security audit
- Complete test coverage
- Performance optimized
- Enterprise features

## [Unreleased]

### Planned Features
- Face liveness detection
- Video-based enrollment
- Batch operations
- Webhook support
- Advanced analytics

---

**Note**: This is an alpha release. Breaking changes may occur in minor version updates.
