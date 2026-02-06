# Contributing to FaceGuard Protocol

First off, thank you for considering contributing to FaceGuard! This is a public good project, and we need people like you to make it successful. 🎉

## 🌟 Ways to Contribute

### 1. **Report Bugs** 🐛
Found something broken? Let us know!
- Check if the issue already exists
- If not, open a new issue with:
  - Clear description of the problem
  - Steps to reproduce
  - Expected vs actual behavior
  - Your environment (OS, Node version, etc.)

### 2. **Suggest Features** 💡
Have an idea to improve the protocol?
- Open an issue with the `enhancement` label
- Describe the feature and why it's valuable
- Discuss implementation approaches
- Wait for community feedback before coding

### 3. **Security Audits** 🔐
Security is critical for biometric data!
- Review smart contract code
- Look for vulnerabilities
- Report privately to: security@faceguard.org
- We appreciate responsible disclosure

### 4. **Write Code** 💻
Ready to contribute code?

**Before you start:**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write tests
5. Ensure all tests pass: `npm test`
6. Submit a pull request

**Code guidelines:**
- Follow existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation
- Keep PRs focused (one feature per PR)

### 5. **Improve Documentation** 📝
Documentation is code too!
- Fix typos
- Clarify confusing sections
- Add examples
- Translate to other languages

### 6. **Spread the Word** 📣
Help us reach more people:
- Star the repository ⭐
- Share on social media
- Write blog posts
- Give talks at meetups
- Create tutorials/videos

---

## 🚀 Development Setup

### Prerequisites
- Node.js v16+
- Git
- Basic understanding of Solidity and Web3

### Setup Steps

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/faceguard-protocol
cd faceguard-protocol

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env

# 4. Run tests
npm test

# 5. Start local blockchain
npx hardhat node

# 6. In another terminal, deploy locally
npx hardhat run scripts/deploy.js --network localhost
```

---

## 📋 Pull Request Process

### 1. **Before Submitting**
- [ ] All tests pass (`npm test`)
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] Branch is up-to-date with main

### 2. **PR Description Template**

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Follows code style
```

### 3. **Review Process**
- Maintainers will review within 3-5 days
- Address feedback
- Once approved, we'll merge!

---

## 🎨 Code Style

### Solidity
```solidity
// ✅ Good
function registerFace(bytes32 _encodingHash) external {
    require(_encodingHash != bytes32(0), "Invalid hash");
    // ... implementation
}

// ❌ Bad
function register_face(bytes32 hash) public {
    require(hash!=bytes32(0));
    // ... implementation
}
```

**Guidelines:**
- Use camelCase for functions and variables
- Use PascalCase for contracts and structs
- Add NatSpec comments
- Prefer custom errors over require strings
- Keep functions under 50 lines

### JavaScript
```javascript
// ✅ Good
async function checkRegistration(hash) {
  const owner = await contract.checkRegistration(hash);
  return owner;
}

// ❌ Bad
function checkRegistration(hash) {
  var owner = contract.checkRegistration(hash)
  return owner
}
```

**Guidelines:**
- Use async/await (not callbacks)
- Use const/let (not var)
- Add semicolons
- Use descriptive variable names
- Keep functions pure when possible

---

## 🧪 Testing

### Writing Tests
```javascript
describe("Feature Name", function () {
  beforeEach(async function () {
    // Setup
  });

  it("Should do something specific", async function () {
    // Arrange
    const input = "test";
    
    // Act
    const result = await contract.someFunction(input);
    
    // Assert
    expect(result).to.equal(expected);
  });
});
```

### Running Tests
```bash
# All tests
npm test

# Specific file
npx hardhat test test/FaceRegistry.test.js

# With gas reporting
REPORT_GAS=true npm test

# With coverage
npm run coverage
```

---

## 🔐 Security Guidelines

### DO ✅
- Report vulnerabilities privately first
- Include proof-of-concept code
- Suggest fixes when possible
- Allow time for fixes before public disclosure

### DON'T ❌
- Publicly disclose vulnerabilities immediately
- Test on mainnet without permission
- Exploit vulnerabilities for personal gain

### Reporting Process
1. Email security@faceguard.org with details
2. We'll respond within 48 hours
3. We'll work on a fix together
4. We'll credit you in the fix announcement
5. After fix is deployed, you can publish details

---

## 📊 Governance

### FaceGuard Improvement Proposals (FGPs)

For major changes, we use a formal proposal process:

1. **Draft**: Write proposal in `governance/proposals/FGP-XXX-title.md`
2. **Discussion**: Community discusses for 14 days
3. **Vote**: Stakeholders vote for 7 days
4. **Implementation**: If approved (>66%), we implement

**Proposal Template:**
```markdown
# FGP-XXX: Title

## Abstract
One-paragraph summary

## Motivation
Why is this needed?

## Specification
Technical details

## Rationale
Why this approach?

## Backwards Compatibility
Any breaking changes?

## Security Considerations
Security implications?
```

---

## 🎯 Priorities

### High Priority
- Security fixes
- Core protocol improvements
- Documentation
- Test coverage
- Integration examples

### Medium Priority
- Developer tooling
- Performance optimizations
- Additional features
- UI/UX improvements

### Low Priority
- Nice-to-have features
- Experimental ideas
- Cosmetic changes

---

## 🏆 Recognition

We appreciate all contributors!

**Ways we recognize contributors:**
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Featured in newsletter
- Invited to contributor calls
- Special Discord role

**Hall of Fame:**
- Most commits
- Best bug reports
- Security disclosures
- Documentation improvements
- Community building

---

## 📞 Communication

### GitHub
- Issues: Bug reports, feature requests
- Discussions: Questions, ideas
- Pull Requests: Code contributions

### Discord
- #general: General chat
- #dev: Development discussion
- #security: Security topics
- #proposals: Governance

### Email
- General: hello@faceguard.org
- Security: security@faceguard.org

---

## ❓ FAQ

**Q: I'm new to blockchain. Can I still contribute?**
A: Yes! Start with documentation, tests, or JavaScript code.

**Q: How long does review take?**
A: Usually 3-5 days. Be patient!

**Q: Do I need to sign a CLA?**
A: No. All contributions are GPL-3.0 licensed.

**Q: Can I get paid for contributions?**
A: Currently no budget. This is volunteer-driven. Once we get grants, we'll consider bounties.

**Q: What if my PR isn't accepted?**
A: Don't take it personally! We'll explain why and suggest improvements.

**Q: Can I use this code in my project?**
A: Yes! GPL-3.0 allows commercial use, but derivatives must be open-source.

---

## 🙏 Thank You!

Every contribution matters, whether it's:
- 1 line of code
- 1 typo fix
- 1 bug report
- 1 share on Twitter

Together, we're building a more ethical AI future. 🚀

---

**Questions?** Open an issue or join our [Discord](https://discord.gg/faceguard)
