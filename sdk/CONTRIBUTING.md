# Contributing to V-Face SDK

Thank you for your interest in contributing to the V-Face SDK! This document provides guidelines and instructions for developers.

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- Git
- Basic knowledge of JavaScript/TypeScript

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/your-org/v-face.git
cd v-face/sdk

# Install dependencies
npm install

# Verify setup
npm test
```

## Development Workflow

### Branch Naming

Use the following format:
- `feature/name-of-feature` - New features
- `fix/name-of-fix` - Bug fixes
- `docs/name-of-docs` - Documentation updates
- `refactor/name-of-refactor` - Code refactoring

```bash
git checkout -b feature/my-feature
```

### Code Style

We follow these conventions:

1. **Formatting**: 4 spaces for indentation
2. **Naming**: camelCase for variables/functions, PascalCase for classes
3. **Comments**: JSDoc comments for public APIs
4. **Error Handling**: Always handle errors, use custom error classes

Example:

```javascript
/**
 * Process a face image and extract embedding.
 *
 * @param {HTMLImageElement|Canvas} imageSource - Input face image
 * @returns {Promise<Float32Array>} 128-d embedding vector
 * @throws {Error} If image cannot be processed
 */
export async function processImage(imageSource) {
    const embedding = await embedding(imageSource);
    return embedding;
}
```

### TypeScript Definitions

When adding new functions or classes, provide TypeScript definitions:

1. Create/update corresponding `.d.ts` file
2. Ensure all parameters and return types are defined
3. Add JSDoc comments to definitions
4. Run TypeScript compiler: `npx tsc --noEmit`

### Testing

#### Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm test -- --watch

# Integration tests (requires server running)
npm run test:integration

# Test coverage
npm test -- --coverage
```

#### Writing Tests

1. Place tests in `test/` directory
2. Name test files with `.test.js` suffix
3. Use Mocha test framework and Chai assertions

Example:

```javascript
import { expect } from 'chai';
import { myFunction } from '../myFunction.js';

describe('myFunction', function() {
    it('should process input correctly', function() {
        const result = myFunction('test');
        expect(result).to.equal('TEST');
    });

    it('should throw on invalid input', function() {
        expect(() => myFunction(null)).to.throw(Error);
    });
});
```

#### Code Coverage Goals

- Aim for >80% coverage on new code
- Critical functions should have 100% coverage
- Test both success and error paths

## Making Changes

### Before You Start

1. Check existing issues and PRs to avoid duplication
2. For major changes, open an issue first to discuss approach
3. Link your PR to related issues

### Implementation Guidelines

1. **Keep changes focused**: One feature/fix per PR
2. **Update documentation**: Update README, JSDoc, and type definitions
3. **Write tests**: All new code should have tests
4. **No breaking changes**: Maintain backward compatibility in stable versions
5. **Security first**: Review code for potential vulnerabilities

### Common Tasks

#### Adding a New Module

1. Create module file: `src/mymodule/index.js`
2. Create type definitions: `src/mymodule/index.d.ts`
3. Create tests: `test/mymodule.test.js`
4. Update exports in `index.js`
5. Add to README examples

#### Fixing a Bug

1. Write a test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Update CHANGELOG.md

#### Improving Performance

1. Benchmark before and after
2. Document performance impact
3. Update documentation if behavior changes

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add fingerprint caching for performance

- Cache fingerprints in memory with TTL
- Add cache invalidation on revocation
- Add metrics for cache hit rate

Fixes #123
```

Format:
```
<type>: <subject>

<body>

Fixes #<issue>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

## Pull Request Process

1. **Create PR** with descriptive title and description
2. **Link issues**: Reference related issues in description
3. **Tests**: All tests must pass
4. **Review**: Wait for code review
5. **Merge**: Use "Squash and merge" for cleaner history

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
How to test the changes

## Checklist
- [ ] Tests pass
- [ ] TypeScript compiles without errors
- [ ] Documentation updated
- [ ] No breaking changes (unless intentional)
```

## Documentation

### README Updates

- Keep examples up-to-date
- Add examples for new features
- Update prerequisites if needed

### Code Comments

- Comment "why", not "what"
- Use TODO/FIXME for known issues
- Keep comments concise

### CHANGELOG

Add entry to `CHANGELOG.md` for all user-facing changes:

```markdown
## [0.2.0] - 2024-02-15

### Added
- Fingerprint caching for improved performance
- New `getEmbedding()` method

### Fixed
- Canvas handling in Node.js environment
- Memory leak in model loading

### Changed
- Updated registry API to v2
```

## Performance Considerations

1. **Model Loading**: Should be <5 seconds
2. **Embedding Generation**: Should be <100ms
3. **Registry Calls**: Should be <500ms
4. **Memory Usage**: Keep under 50MB for preprocessing

## Security Guidelines

1. **Input Validation**: Always validate user input
2. **Error Messages**: Don't leak sensitive information
3. **Dependencies**: Keep dependencies updated
4. **Secrets**: Never commit API keys or secrets

```javascript
// ❌ Don't
throw new Error(`Failed to register with key: ${privateKey}`);

// ✅ Do
throw new Error('Failed to register identity');
```

## Browser Compatibility

- Target ES2020+ (modern browsers)
- Test in Chrome, Firefox, Safari
- Test mobile browsers (iOS Safari, Chrome Mobile)

## Debugging

### Browser DevTools

```javascript
// Enable verbose logging
localStorage.setItem('VFACE_DEBUG', 'true');
sdk.init(); // Will log detailed info
```

### Node.js

```bash
DEBUG=vface* node app.js
```

## Releasing

Only maintainers can release. The process:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v0.2.0`
4. Push tag: `git push origin v0.2.0`
5. GitHub Actions will publish to npm

## Code Review Process

Reviewers look for:

- ✅ Code correctness
- ✅ Test coverage
- ✅ Documentation quality
- ✅ Performance implications
- ✅ Security issues
- ✅ Breaking changes

Be respectful of feedback and discuss any concerns.

## Getting Help

- **Issues**: Open an issue for bugs or features
- **Discussions**: Use GitHub discussions for questions
- **Email**: team@v-face.io for sensitive security issues
- **Discord**: Join our Discord for real-time chat

## Code of Conduct

We are committed to fostering an open and inclusive community. Please:

- Be respectful and professional
- Welcome newcomers and diverse perspectives
- Report violations to team@v-face.io

## License

By contributing, you agree your code can be used under the GPL-3.0 license.

## Additional Resources

- [API Documentation](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [V-Face Protocol](../PROTOCOL.md)

Thank you for contributing! 🎉
