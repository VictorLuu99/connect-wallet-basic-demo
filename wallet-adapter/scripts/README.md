# Publishing Scripts

This directory contains scripts for publishing Phoenix Wallet packages to npm.

## Scripts Overview

### `prepare-publish.js`
Converts `workspace:*` dependencies to actual version numbers before publishing.

**Usage:**
```bash
node scripts/prepare-publish.js
```

### `restore-workspace.js`
Restores `workspace:*` dependencies after publishing (for local development).

**Usage:**
```bash
node scripts/restore-workspace.js
```

### `publish.sh`
Main publishing script that handles the entire workflow:
1. Cleans previous builds
2. Builds all packages
3. Prepares dependencies
4. Publishes in correct order
5. Restores workspace dependencies

**Usage:**
```bash
npm run publish:all
# or
bash scripts/publish.sh
```

### `version-bump.sh`
Bumps version for all packages simultaneously.

**Usage:**
```bash
npm run version:bump patch   # 0.3.0 -> 0.3.1
npm run version:bump minor   # 0.3.0 -> 0.4.0
npm run version:bump major   # 0.3.0 -> 1.0.0
```

### `check-publish.sh`
Pre-publish validation script that checks:
- Dist folders exist
- README files exist
- LICENSE files exist
- npm authentication

**Usage:**
```bash
npm run publish:check
# or
bash scripts/check-publish.sh
```

## Workflow

1. **Check readiness**: `npm run publish:check`
2. **Bump version**: `npm run version:bump patch`
3. **Commit & tag**: `git add . && git commit -m "chore: bump version" && git tag v0.3.1`
4. **Publish**: `npm run publish:all`

See [PUBLISH.md](../PUBLISH.md) for detailed publishing guide.

