# Phoenix SDK Publishing Guide

Complete guide for publishing Phoenix SDKs to npm registry.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Publish Checklist](#pre-publish-checklist)
3. [Publishing Workflow](#publishing-workflow)
4. [Version Management](#version-management)
5. [Automated Publishing](#automated-publishing)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js**: >= 16.0.0
- **npm**: Latest version
- **TypeScript**: ^5.3.3
- **Git**: For version control

### NPM Account Setup

1. **Create NPM Account** (if you don't have one):
   ```bash
   # Visit https://www.npmjs.com/signup
   ```

2. **Login to NPM**:
   ```bash
   npm login
   ```
   Enter your credentials:
   - Username
   - Password
   - Email (will be public)
   - OTP (if 2FA enabled)

3. **Verify Login**:
   ```bash
   npm whoami
   # Should display your username
   ```

---

## Pre-Publish Checklist

### Before Every Publish

- [ ] All tests passing
- [ ] TypeScript builds without errors
- [ ] Version number updated in `package.json`
- [ ] `CHANGELOG.md` updated with changes
- [ ] `README.md` is accurate and complete
- [ ] LICENSE file exists
- [ ] No sensitive data in code
- [ ] Dependencies are up to date

### First-Time Publish Only

- [ ] Package name is available on npm
- [ ] `publishConfig.access` set to `"public"` for scoped packages
- [ ] Author field populated
- [ ] Keywords added for discoverability
- [ ] Repository URL added (optional but recommended)

---

## Publishing Workflow

### Manual Publishing (Step by Step)

#### 1. Update Version

Choose semantic versioning strategy:

```bash
# Patch release (0.1.0 -> 0.1.1) - Bug fixes
npm version patch

# Minor release (0.1.0 -> 0.2.0) - New features (backward compatible)
npm version minor

# Major release (0.1.0 -> 1.0.0) - Breaking changes
npm version major

# Pre-release versions
npm version prerelease --preid=beta  # 0.1.0 -> 0.1.1-beta.0
```

#### 2. Update CHANGELOG

Edit `CHANGELOG.md` with new version details:

```markdown
## [0.2.0] - 2025-11-07

### Added
- New feature description

### Changed
- Modified behavior description

### Fixed
- Bug fix description

### Breaking Changes
- Breaking change description (if any)
```

#### 3. Build Package

```bash
# For phoenix-dapp
cd packages/phoenix-dapp
npm run clean
npm run build

# For phoenix-wallet
cd packages/phoenix-wallet
npm run clean
npm run build
```

#### 4. Test Package Locally (Optional)

```bash
# Create tarball
npm pack

# Install in test project
cd /path/to/test-project
npm install /path/to/vincenttaylorlab3-phoenix-dapp-0.2.0.tgz
```

#### 5. Dry Run Publish

```bash
npm publish --dry-run
```

This shows what will be published without actually publishing.

#### 6. Publish to NPM

```bash
npm publish --access public
```

For scoped packages, `--access public` is required unless you have a paid npm account.

#### 7. Verify Publication

```bash
npm view @vincenttaylorlab3/phoenix-dapp version
npm view @vincenttaylorlab3/phoenix-wallet version
```

Visit your package pages:
- https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-dapp
- https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-wallet

#### 8. Git Commit and Tag

```bash
git add .
git commit -m "chore: publish v0.2.0"
git tag v0.2.0
git push origin main --tags
```

---

## Version Management

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (1.0.0 -> 2.0.0)
- **MINOR**: New features, backward compatible (0.1.0 -> 0.2.0)
- **PATCH**: Bug fixes, backward compatible (0.1.0 -> 0.1.1)

### Pre-release Versions

Use pre-release versions for testing:

```bash
# Beta releases
npm version prerelease --preid=beta
# 0.1.0 -> 0.1.1-beta.0
# 0.1.1-beta.0 -> 0.1.1-beta.1

# Alpha releases
npm version prerelease --preid=alpha
# 0.1.0 -> 0.1.1-alpha.0

# Release candidate
npm version prerelease --preid=rc
# 0.1.0 -> 0.1.1-rc.0
```

### Publishing Pre-releases

```bash
# Publish with beta tag
npm publish --tag beta

# Publish with alpha tag
npm publish --tag alpha

# Users can install with:
npm install @vincenttaylorlab3/phoenix-dapp@beta
```

### Promoting Pre-release to Stable

```bash
# After testing beta version
npm dist-tag add @vincenttaylorlab3/phoenix-dapp@0.2.0-beta.0 latest
```

---

## Automated Publishing

### Using the Publish Script

We provide an automated script for easy publishing:

```bash
# From project root
npm run publish:sdk

# Or from packages directory
cd packages
./publish-sdk.sh
```

### Script Features

- ✅ Validates you're logged in to npm
- ✅ Runs tests and builds
- ✅ Prompts for version bump (patch/minor/major)
- ✅ Updates CHANGELOG.md
- ✅ Runs dry-run first
- ✅ Publishes both packages
- ✅ Creates git tags
- ✅ Verification checks

### CI/CD Publishing (GitHub Actions)

For automated publishing on git tags:

```yaml
# .github/workflows/publish.yml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: |
          cd packages/phoenix-dapp && npm ci
          cd ../phoenix-wallet && npm ci

      - name: Build packages
        run: |
          cd packages/phoenix-dapp && npm run build
          cd ../phoenix-wallet && npm run build

      - name: Publish to NPM
        run: |
          cd packages/phoenix-dapp && npm publish --access public
          cd ../phoenix-wallet && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Troubleshooting

### Common Issues

#### 1. "Scope not found" Error

**Problem**: `@phoenix-demo` organization doesn't exist

**Solution**: Use your username scope or create organization on npmjs.com
```bash
# Change package name in package.json
"name": "@your-username/package-name"
```

#### 2. "Need auth" Error

**Problem**: Not logged in to npm

**Solution**:
```bash
npm logout
npm login
```

#### 3. "Version already exists"

**Problem**: Trying to publish same version twice

**Solution**: Bump version number
```bash
npm version patch
```

#### 4. "You do not have permission to publish"

**Problem**: Package name belongs to someone else or organization you're not part of

**Solution**: Change package name or request access to organization

#### 5. TypeScript Build Errors

**Problem**: Build fails before publish

**Solution**:
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

#### 6. "Package size too large"

**Problem**: Package exceeds npm size limits

**Solution**: Add files to `.npmignore`:
```
# .npmignore
src/
tests/
*.test.ts
*.spec.ts
.github/
examples/
```

#### 7. Missing Dependencies

**Problem**: Package doesn't work after installation

**Solution**: Check `dependencies` vs `devDependencies` in package.json
- Runtime deps → `dependencies`
- Build-time only → `devDependencies`

### Getting Help

- **NPM Documentation**: https://docs.npmjs.com/
- **Semantic Versioning**: https://semver.org/
- **npm support**: https://www.npmjs.com/support

---

## Best Practices

### Security

1. **Never commit secrets**:
   ```bash
   # .gitignore
   .npmrc
   .env
   ```

2. **Enable 2FA** on npm account

3. **Use npm tokens** for CI/CD (not passwords)

4. **Audit dependencies** regularly:
   ```bash
   npm audit
   npm audit fix
   ```

### Quality

1. **Test before publishing**:
   ```bash
   npm test
   npm run build
   ```

2. **Use semantic versioning** strictly

3. **Document breaking changes** clearly

4. **Keep CHANGELOG.md** up to date

### Maintenance

1. **Deprecate old versions** when needed:
   ```bash
   npm deprecate @vincenttaylorlab3/phoenix-dapp@0.1.0 "Please upgrade to 0.2.0"
   ```

2. **Unpublish** only within 72 hours (if absolutely necessary):
   ```bash
   npm unpublish @vincenttaylorlab3/phoenix-dapp@0.1.0
   ```

3. **Monitor downloads** and issues:
   - Check npm package page
   - Review GitHub issues
   - Monitor user feedback

---

## Quick Reference

### Common Commands

```bash
# Check current version
npm version

# Login/logout
npm login
npm logout
npm whoami

# Version bumps
npm version patch
npm version minor
npm version major

# Publishing
npm publish --dry-run
npm publish --access public

# View package info
npm view @vincenttaylorlab3/phoenix-dapp
npm view @vincenttaylorlab3/phoenix-dapp versions

# Manage tags
npm dist-tag ls @vincenttaylorlab3/phoenix-dapp
npm dist-tag add @vincenttaylorlab3/phoenix-dapp@0.2.0 latest

# Deprecate/unpublish
npm deprecate @vincenttaylorlab3/phoenix-dapp@0.1.0 "message"
npm unpublish @vincenttaylorlab3/phoenix-dapp@0.1.0
```

---

## Next Steps

After publishing:

1. ✅ Update project documentation with installation instructions
2. ✅ Announce release on social media / community
3. ✅ Monitor for issues and feedback
4. ✅ Plan next version based on feedback

Happy publishing! 🚀
