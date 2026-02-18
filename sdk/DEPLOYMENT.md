# V-Face SDK Deployment Checklist

Complete this checklist before deploying the V-Face SDK to production.

## Pre-Deployment Setup

### 1. Environment Configuration
- [ ] Set `NODE_ENV=production`
- [ ] Configure `VFACE_REGISTRY_URL` environment variable
- [ ] Configure model path (`MODEL_PATH` or use default `/model/mobilefacenet.onnx`)
- [ ] Verify Node.js version >= 16.0.0
- [ ] Update SDK version in `package.json`

### 2. Model File Preparation
- [ ] Download or convert MobileFaceNet ONNX model
- [ ] Verify model file size (should be ~3.8 MB, not a placeholder)
- [ ] Place model at `./model/mobilefacenet.onnx` or configure custom path
- [ ] Test model loading in development environment
- [ ] Generate model file hash for integrity verification

```bash
sha256sum ./model/mobilefacenet.onnx
# Expected: 85cdeb7368ed6a1e9cbaaa6f283c6b2439f1fa533c17450bfdc7f357d285d5d1
```

### 3. Dependencies
- [ ] Run `npm install` in `/sdk` directory
- [ ] Verify all dependencies are installed (check `node_modules`)
- [ ] Optional: Run `npm install --only=prod` for production-only install
- [ ] Check for security vulnerabilities: `npm audit`

```bash
cd sdk
npm install
npm audit
```

### 4. Testing
- [ ] Run unit tests: `npm test`
- [ ] Start registry server: `node server/index.js`
- [ ] Run integration tests: `npm run test:integration`
- [ ] All tests should pass
- [ ] Check test coverage (if available)

```bash
npm test
npm run test:integration
```

## Code Quality

### 5. Code Review
- [ ] Review all changes from development branch
- [ ] Check for console.log/debug statements
- [ ] Verify error handling is proper
- [ ] Check for hardcoded values or test constants

### 6. Security Review
- [ ] Verify no secrets in code (API keys, private keys, etc.)
- [ ] Check `.gitignore` includes sensitive files
- [ ] Audit dependencies for vulnerabilities (`npm audit`)
- [ ] Verify CORS configuration on registry server
- [ ] Confirm HTTPS is enforced in production

### 7. Performance Review
- [ ] Model loading time is acceptable
- [ ] Embedding generation latency is acceptable
- [ ] Memory usage is within limits
- [ ] No memory leaks in long-running applications

## Documentation

### 8. README & Docs
- [ ] README.md is complete and accurate
- [ ] API documentation is up-to-date
- [ ] Examples are tested and working
- [ ] Error codes and meanings are documented
- [ ] Build/deployment instructions are clear

### 9. TypeScript Definitions
- [ ] All `.d.ts` files are present
- [ ] Type definitions are complete and accurate
- [ ] Exports in `index.d.ts` match actual exports
- [ ] No `any` types unless necessary

```bash
# Verify TypeScript compiles without errors
npx tsc --noEmit
```

## Browser Build (if needed)

### 10. Bundle Configuration
- [ ] Build tool configured (Webpack, Vite, Rollup, etc.)
- [ ] UMD/ES module builds present in `dist/`
- [ ] Bundle size is reasonable <100KB gzipped
- [ ] Source maps are generated for debugging
- [ ] CDN ready for distribution

```bash
npm run build  # If build script exists
ls -lh dist/
```

## Registry Server Integration

### 11. API Compatibility
- [ ] Registry server version is compatible
- [ ] All endpoints documented:
  - [ ] POST `/register`
  - [ ] POST `/check`
  - [ ] POST `/revoke`
  - [ ] POST `/search`
  - [ ] POST `/consent/request`
  - [ ] POST `/consent/approve`
  - [ ] POST `/verify`
- [ ] Error responses match SDK expectations
- [ ] CORS headers properly configured

### 12. Endpoint Testing
Test each endpoint with the SDK:

```bash
# Start SDK in Node.js REPL
node -e "
import('./index.js').then(async (mod) => {
  const sdk = new mod.VFaceSDK({ registryUrl: 'http://localhost:3000' });
  await sdk.init();
  console.log('✅ SDK initialized');
});
"
```

## Deployment Steps

### 13. Production Deployment
- [ ] Create git tag for release: `git tag v0.1.0`
- [ ] Push tag to remote: `git push origin v0.1.0`
- [ ] Deploy to npm registry: `npm publish`
- [ ] Verify on npm: `npm view @v-face/sdk`

```bash
npm version patch
npm publish
```

### 14. CDN Deployment (if applicable)
- [ ] Build browser bundles
- [ ] Upload to CDN (e.g., jsDelivr, unpkg)
- [ ] Verify CDN URLs are accessible
- [ ] Update documentation with CDN links

### 15. Monitoring & Logging
- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Configure performance monitoring
- [ ] Add analytics for SDK usage
- [ ] Set up alerts for critical errors
- [ ] Monitor model loading failures

## Post-Deployment

### 16. Verification
- [ ] Verify npm package is installable: `npm install @v-face/sdk`
- [ ] Test using published package (not local version)
- [ ] Verify TypeScript definitions work
- [ ] Test in browser environment
- [ ] Test in Node.js environment

```bash
# In a separate directory
npm install @v-face/sdk
node -e "
import('@v-face/sdk').then(m => {
  console.log('✅ SDK import successful');
  console.log('Exports:', Object.keys(m));
});
"
```

### 17. Documentation Updates
- [ ] Update project README with SDK info
- [ ] Update API documentation links
- [ ] Update CHANGELOG with new version
- [ ] Update version in all relevant files
- [ ] Announce release in relevant channels

### 18. Rollback Plan
- [ ] Document rollback procedure
- [ ] Keep previous version available
- [ ] Prepare rollback command: `npm install @v-face/sdk@<previous-version>`
- [ ] Document how to report issues

## Ongoing Maintenance

### 19. Issue Tracking
- [ ] Set up issue templates on GitHub
- [ ] Create release notes for version
- [ ] Document known issues
- [ ] Set up bug report process

### 20. Version Management
- [ ] Follow semantic versioning
- [ ] Update version before each release
- [ ] Tag releases in git
- [ ] Maintain CHANGELOG.md
- [ ] Update dependencies periodically

## Checklist Sign-Off

- [ ] **Developer**: Code complete and tested (date: _______)
- [ ] **Reviewer**: Code reviewed and approved (date: _______)
- [ ] **QA**: Testing complete (date: _______)
- [ ] **Deployment**: Deployed to production (date: _______)

## Quick Reference Commands

```bash
# Development
cd sdk
npm install
npm test

# Build (if applicable)
npm run build

# Integration Testing
npm run test:integration

# Publishing
npm publish

# Verification
npm view @v-face/sdk
npm install @v-face/sdk@latest
```

## Support & Issues

If issues occur during or after deployment:

1. Check error logs for specific failures
2. Review Registry server compatibility
3. Verify model file integrity
4. Check environment variables
5. Run compatibility tests
6. Contact V-Face team for support

## Notes

Use this section for deployment-specific notes or blockers:

```
[Deployment Date: ____________________]
[Deployed By: ____________________]
[Notes: ]
```
