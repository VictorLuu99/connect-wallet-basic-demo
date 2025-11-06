# Phoenix SDK Publishing - Quick Start

## TL;DR - Publish New Version

```bash
cd packages

# Option 1: Interactive (Recommended)
./publish-sdk.sh

# Option 2: Quick (if versions already bumped)
./quick-publish.sh
```

## One-Time Setup

### 1. Login to NPM
```bash
npm login
```

Enter your credentials when prompted.

### 2. Verify Login
```bash
npm whoami
# Should show: vincenttaylorlab3
```

## Publishing Workflow

### Interactive Publishing (Best for Most Cases)

```bash
cd packages
./publish-sdk.sh
```

The script will:
1. Check you're logged in ✓
2. Ask which version bump you want (patch/minor/major/prerelease)
3. Update both package versions
4. Build both packages
5. Run dry-run tests
6. Show what will be published
7. Ask for confirmation
8. Publish both packages
9. Verify they're live on npm

### Quick Publishing (When Version Already Updated)

```bash
cd packages
./quick-publish.sh
```

Use this when you've already manually updated versions in package.json files.

### Manual Version Bump

```bash
# phoenix-dapp
cd packages/phoenix-dapp
npm version patch  # or minor/major
npm run build

# phoenix-wallet
cd packages/phoenix-wallet
npm version patch  # or minor/major
npm run build

# Then use quick-publish.sh
cd ..
./quick-publish.sh
```

## Version Types

- **patch** (0.1.0 → 0.1.1) - Bug fixes only
- **minor** (0.1.0 → 0.2.0) - New features, backward compatible
- **major** (0.1.0 → 1.0.0) - Breaking changes
- **prerelease** (0.1.0 → 0.1.1-beta.0) - Beta/alpha releases

## After Publishing

### 1. Update Changelogs

Edit `CHANGELOG.md` in both packages with the new version details.

### 2. Commit and Tag

```bash
git add .
git commit -m "chore: publish v0.2.0"
git tag v0.2.0
git push origin main --tags
```

### 3. Verify Live

Visit package pages:
- https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-dapp
- https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-wallet

Or check via CLI:
```bash
npm view @vincenttaylorlab3/phoenix-dapp version
npm view @vincenttaylorlab3/phoenix-wallet version
```

## Helper Scripts

All scripts are in `packages/` directory:

| Script | Purpose |
|--------|---------|
| `publish-sdk.sh` | Interactive publishing with prompts |
| `quick-publish.sh` | Fast publish (no prompts) |
| `build-all.sh` | Build both packages |
| `clean-all.sh` | Clean build artifacts |

## Troubleshooting

### "Not logged in" Error
```bash
npm logout
npm login
```

### "Version already published" Error
```bash
# Bump version again
cd packages/phoenix-dapp
npm version patch
cd ../phoenix-wallet
npm version patch
```

### Build Errors
```bash
cd packages
./clean-all.sh
./build-all.sh
```

### "Scope not found" Error
Package name must be `@vincenttaylorlab3/package-name` (your npm username).

## More Info

- **[PUBLISHING_GUIDE.md](./PUBLISHING_GUIDE.md)** - Complete guide with all details
- **[README.md](./README.md)** - Package overview and documentation links

## Published Packages

Current versions live on npm:

- **@vincenttaylorlab3/phoenix-dapp@0.1.0**
  - Install: `npm install @vincenttaylorlab3/phoenix-dapp`
  - Page: https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-dapp

- **@vincenttaylorlab3/phoenix-wallet@0.1.0**
  - Install: `npm install @vincenttaylorlab3/phoenix-wallet`
  - Page: https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-wallet

## Need Help?

Check the full [PUBLISHING_GUIDE.md](./PUBLISHING_GUIDE.md) for detailed troubleshooting and best practices.
