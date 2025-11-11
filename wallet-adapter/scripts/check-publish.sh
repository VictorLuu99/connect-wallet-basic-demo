#!/bin/bash

# Check if packages are ready to be published

echo "🔍 Checking packages before publishing..."
echo ""

PACKAGES=("core" "evm" "aptos" "solana" "sui" "privy")
ERRORS=0

for pkg in "${PACKAGES[@]}"; do
  echo "Checking @phoenix-wallet/$pkg..."
  
  # Check if dist folder exists
  if [ ! -d "packages/$pkg/dist" ]; then
    echo "  ❌ Missing dist folder"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✓ dist folder exists"
  fi
  
  # Check if README exists
  if [ ! -f "packages/$pkg/README.md" ]; then
    echo "  ❌ Missing README.md"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✓ README.md exists"
  fi
  
  # Check if LICENSE exists
  if [ ! -f "packages/$pkg/LICENSE" ]; then
    echo "  ⚠️  Missing LICENSE file"
    echo "     (Will be created automatically)"
  else
    echo "  ✓ LICENSE exists"
  fi
  
  echo ""
done

# Check npm login
echo "Checking npm authentication..."
if npm whoami &> /dev/null; then
  echo "  ✓ Logged in as: $(npm whoami)"
else
  echo "  ❌ Not logged in to npm"
  echo "     Run: npm login"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "================================"

if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed! Ready to publish."
  echo ""
  echo "Run: npm run publish:all"
else
  echo "❌ Found $ERRORS error(s). Please fix them before publishing."
  exit 1
fi

