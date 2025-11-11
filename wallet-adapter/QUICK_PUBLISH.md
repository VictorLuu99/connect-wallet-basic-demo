# 🚀 Quick Publish Guide

⚠️ **IMPORTANT:** Always use the automated publish script to avoid dependency issues!

If you're experiencing "Module not found" errors after installing from npm, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## First Time Setup

```bash
# 1. Login to npm
npm login

# 2. Verify login
npm whoami
```

## Publishing Workflow

### Option 1: Automatic (Recommended)

```bash
# Step 1: Check if ready
npm run publish:check

# Step 2: Bump version (choose one)
npm run version:bump patch    # Bug fixes
npm run version:bump minor    # New features
npm run version:bump major    # Breaking changes

# Step 3: Commit and tag
git add .
git commit -m "chore: bump version to $(node -p "require('./packages/core/package.json').version")"
git tag v$(node -p "require('./packages/core/package.json').version")
git push && git push --tags

# Step 4: Publish
npm run publish:all
```

### Option 2: Manual Control

```bash
# Build packages
npm run packages:build

# Prepare for publish
npm run publish:prepare

# Publish each package
cd packages/core && npm publish --access public && cd ../..
cd packages/evm && npm publish --access public && cd ../..
cd packages/aptos && npm publish --access public && cd ../..
cd packages/solana && npm publish --access public && cd ../..
cd packages/sui && npm publish --access public && cd ../..
cd packages/privy && npm publish --access public && cd ../..

# Restore workspace dependencies
npm run publish:restore
```

## Available Commands

```bash
npm run packages:build      # Build all packages
npm run packages:clean      # Clean dist folders
npm run publish:check       # Pre-publish validation
npm run publish:integrity   # Check package integrity (dependencies, exports, etc.)
npm run publish:prepare     # Convert workspace:* to actual versions
npm run publish:restore     # Restore workspace:* for local dev
npm run version:bump [type] # Bump version (patch/minor/major)
npm run publish:all         # Full publish workflow (recommended)
```

## Troubleshooting

**Module not found errors after installing from npm?**
See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

**Already published?**
```bash
npm run version:bump patch
```

**Not logged in?**
```bash
npm login
```

**Need to restore workspace?**
```bash
npm run publish:restore
```

**Check package integrity:**
```bash
npm run publish:integrity
```

## Package URLs

After publishing, check:
- https://npmjs.com/package/@phoenix-wallet/core
- https://npmjs.com/package/@phoenix-wallet/evm
- https://npmjs.com/package/@phoenix-wallet/aptos
- https://npmjs.com/package/@phoenix-wallet/solana
- https://npmjs.com/package/@phoenix-wallet/sui
- https://npmjs.com/package/@phoenix-wallet/privy

---

📖 For detailed guide in Vietnamese, see [HUONG_DAN_PUBLISH.md](./HUONG_DAN_PUBLISH.md)

