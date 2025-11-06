#!/bin/bash

# Phoenix SDK Publishing Script
# Automates the process of publishing both Phoenix SDKs to npm

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAPP_DIR="$SCRIPT_DIR/phoenix-dapp"
WALLET_DIR="$SCRIPT_DIR/phoenix-wallet"

echo ""
echo "=========================================="
echo "  Phoenix SDK Publishing Script"
echo "=========================================="
echo ""

# Step 1: Check npm login
print_info "Checking npm authentication..."
if ! npm whoami &> /dev/null; then
  print_error "Not logged in to npm"
  echo ""
  echo "Please run: npm login"
  exit 1
fi

NPM_USER=$(npm whoami)
print_success "Logged in as: $NPM_USER"
echo ""

# Step 2: Select version bump type
echo "Select version bump type:"
echo "  1) patch (0.1.0 -> 0.1.1) - Bug fixes"
echo "  2) minor (0.1.0 -> 0.2.0) - New features"
echo "  3) major (0.1.0 -> 1.0.0) - Breaking changes"
echo "  4) prerelease (0.1.0 -> 0.1.1-beta.0) - Pre-release"
echo "  5) skip version bump"
echo ""
read -p "Enter choice [1-5]: " VERSION_CHOICE

case $VERSION_CHOICE in
  1)
    VERSION_TYPE="patch"
    ;;
  2)
    VERSION_TYPE="minor"
    ;;
  3)
    VERSION_TYPE="major"
    ;;
  4)
    VERSION_TYPE="prerelease"
    read -p "Enter prerelease identifier (beta/alpha/rc): " PREID
    VERSION_TYPE="prerelease --preid=$PREID"
    ;;
  5)
    print_warning "Skipping version bump"
    VERSION_TYPE=""
    ;;
  *)
    print_error "Invalid choice"
    exit 1
    ;;
esac

echo ""

# Step 3: Clean and build phoenix-dapp
print_info "Building @vincenttaylorlab3/phoenix-dapp..."
cd "$DAPP_DIR"

# Update version if needed
if [ -n "$VERSION_TYPE" ]; then
  npm version $VERSION_TYPE --no-git-tag-version
  DAPP_VERSION=$(node -p "require('./package.json').version")
  print_success "Version updated to: $DAPP_VERSION"
fi

# Clean and build
npm run clean
npm run build

if [ $? -ne 0 ]; then
  print_error "Build failed for phoenix-dapp"
  exit 1
fi

print_success "phoenix-dapp built successfully"
echo ""

# Step 4: Clean and build phoenix-wallet
print_info "Building @vincenttaylorlab3/phoenix-wallet..."
cd "$WALLET_DIR"

# Update version if needed
if [ -n "$VERSION_TYPE" ]; then
  npm version $VERSION_TYPE --no-git-tag-version
  WALLET_VERSION=$(node -p "require('./package.json').version")
  print_success "Version updated to: $WALLET_VERSION"
fi

# Clean and build
npm run clean
npm run build

if [ $? -ne 0 ]; then
  print_error "Build failed for phoenix-wallet"
  exit 1
fi

print_success "phoenix-wallet built successfully"
echo ""

# Step 5: Dry run
print_info "Running dry-run publish tests..."

cd "$DAPP_DIR"
npm publish --dry-run > /dev/null 2>&1
if [ $? -ne 0 ]; then
  print_error "Dry-run failed for phoenix-dapp"
  cd "$DAPP_DIR"
  npm publish --dry-run
  exit 1
fi
print_success "phoenix-dapp dry-run passed"

cd "$WALLET_DIR"
npm publish --dry-run > /dev/null 2>&1
if [ $? -ne 0 ]; then
  print_error "Dry-run failed for phoenix-wallet"
  cd "$WALLET_DIR"
  npm publish --dry-run
  exit 1
fi
print_success "phoenix-wallet dry-run passed"
echo ""

# Step 6: Show what will be published
cd "$DAPP_DIR"
DAPP_VERSION=$(node -p "require('./package.json').version")

cd "$WALLET_DIR"
WALLET_VERSION=$(node -p "require('./package.json').version")

echo "=========================================="
echo "  Ready to Publish"
echo "=========================================="
echo ""
echo "Packages:"
echo "  • @vincenttaylorlab3/phoenix-dapp@$DAPP_VERSION"
echo "  • @vincenttaylorlab3/phoenix-wallet@$WALLET_VERSION"
echo ""
echo "NPM Account: $NPM_USER"
echo ""

# Step 7: Confirm publish
read -p "Proceed with publishing? [y/N]: " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
  print_warning "Publishing cancelled"
  exit 0
fi

echo ""

# Step 8: Publish phoenix-dapp
print_info "Publishing @vincenttaylorlab3/phoenix-dapp@$DAPP_VERSION..."
cd "$DAPP_DIR"

npm publish --access public

if [ $? -ne 0 ]; then
  print_error "Failed to publish phoenix-dapp"
  exit 1
fi

print_success "phoenix-dapp@$DAPP_VERSION published successfully"
echo ""

# Step 9: Publish phoenix-wallet
print_info "Publishing @vincenttaylorlab3/phoenix-wallet@$WALLET_VERSION..."
cd "$WALLET_DIR"

npm publish --access public

if [ $? -ne 0 ]; then
  print_error "Failed to publish phoenix-wallet"
  exit 1
fi

print_success "phoenix-wallet@$WALLET_VERSION published successfully"
echo ""

# Step 10: Verify publications
print_info "Verifying publications..."

sleep 2  # Wait for npm registry to update

DAPP_PUBLISHED=$(npm view @vincenttaylorlab3/phoenix-dapp version 2>/dev/null)
WALLET_PUBLISHED=$(npm view @vincenttaylorlab3/phoenix-wallet version 2>/dev/null)

if [ "$DAPP_PUBLISHED" == "$DAPP_VERSION" ]; then
  print_success "phoenix-dapp@$DAPP_VERSION is live on npm"
else
  print_warning "phoenix-dapp verification failed (may take a few minutes to propagate)"
fi

if [ "$WALLET_PUBLISHED" == "$WALLET_VERSION" ]; then
  print_success "phoenix-wallet@$WALLET_VERSION is live on npm"
else
  print_warning "phoenix-wallet verification failed (may take a few minutes to propagate)"
fi

echo ""
echo "=========================================="
echo "  ✓ Publishing Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Update CHANGELOG.md for both packages"
echo "  2. Commit changes: git commit -am 'chore: publish v$DAPP_VERSION'"
echo "  3. Create git tag: git tag v$DAPP_VERSION"
echo "  4. Push changes: git push origin main --tags"
echo ""
echo "Package URLs:"
echo "  • https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-dapp"
echo "  • https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-wallet"
echo ""
