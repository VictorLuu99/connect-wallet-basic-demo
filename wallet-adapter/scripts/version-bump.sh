#!/bin/bash

# Script to bump version for all packages

if [ -z "$1" ]; then
  echo "Usage: npm run version:bump [patch|minor|major]"
  echo ""
  echo "Examples:"
  echo "  npm run version:bump patch   # 0.3.0 -> 0.3.1"
  echo "  npm run version:bump minor   # 0.3.0 -> 0.4.0"
  echo "  npm run version:bump major   # 0.3.0 -> 1.0.0"
  exit 1
fi

VERSION_TYPE=$1

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "❌ Invalid version type. Use: patch, minor, or major"
  exit 1
fi

echo "🔢 Bumping version ($VERSION_TYPE) for all packages..."
echo ""

PACKAGES=("core" "evm" "aptos" "solana" "sui" "privy")

for pkg in "${PACKAGES[@]}"; do
  echo "Updating @phoenix-wallet/$pkg..."
  cd packages/$pkg
  npm version $VERSION_TYPE --no-git-tag-version
  cd ../..
done

# Get new version from core package
NEW_VERSION=$(node -p "require('./packages/core/package.json').version")

echo ""
echo "✅ All packages updated to version $NEW_VERSION"
echo ""
echo "Next steps:"
echo "  1. Review the changes"
echo "  2. Commit: git add . && git commit -m 'chore: bump version to $NEW_VERSION'"
echo "  3. Tag: git tag v$NEW_VERSION"
echo "  4. Push: git push && git push --tags"
echo "  5. Publish: npm run publish:all"

