#!/bin/bash

set -e

echo "🚀 Phoenix Wallet Publishing Script"
echo "===================================="
echo ""

# Check if user is logged in to npm
if ! npm whoami &> /dev/null; then
  echo "❌ You are not logged in to npm"
  echo "Please run: npm login"
  exit 1
fi

echo "✓ Logged in as: $(npm whoami)"
echo ""

# Ask for confirmation
read -p "Are you sure you want to publish all packages? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Publishing cancelled"
  exit 1
fi

echo ""
echo "📦 Step 1: Cleaning previous builds..."
pnpm -r --filter './packages/*' run clean || true

echo ""
echo "🔨 Step 2: Building all packages..."
pnpm -r --filter './packages/*' run build

echo ""
echo "🔧 Step 3: Preparing packages for publishing..."
node scripts/prepare-publish.js

echo ""
echo "🔍 Step 4: Checking package integrity..."
node scripts/check-package-integrity.js

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Package integrity check failed!"
  echo "🔄 Restoring workspace dependencies..."
  node scripts/restore-workspace.js
  exit 1
fi

echo ""
echo "📤 Step 5: Publishing packages..."
echo ""

# Publish in order (core first, then others)
PACKAGES=("core" "evm" "aptos" "solana" "sui" "privy")

for pkg in "${PACKAGES[@]}"; do
  echo "Publishing @phoenix-wallet/$pkg..."
  cd packages/$pkg
  
  # Try to publish, continue if already published
  if npm publish --access public 2>&1 | tee /dev/tty | grep -q "You cannot publish over the previously published versions"; then
    echo "⚠️  Version already published, skipping..."
  else
    echo "✅ Published @phoenix-wallet/$pkg"
  fi
  
  cd ../..
  echo ""
done

echo ""
echo "🔄 Step 6: Restoring workspace dependencies..."
node scripts/restore-workspace.js

echo ""
echo "🎉 Publishing complete!"
echo ""
echo "Your packages are now available at:"
for pkg in "${PACKAGES[@]}"; do
  echo "  - https://www.npmjs.com/package/@phoenix-wallet/$pkg"
done

