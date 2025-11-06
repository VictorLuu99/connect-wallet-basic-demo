#!/bin/bash

# Quick Publish Script - No prompts, just publish current versions
# Use this when you've already bumped versions manually

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
print_info "Quick Publishing Phoenix SDKs..."
echo ""

# Check npm login
if ! npm whoami &> /dev/null; then
  print_error "Not logged in to npm. Run: npm login"
  exit 1
fi

print_success "Logged in as: $(npm whoami)"

# Build and publish phoenix-dapp
cd "$SCRIPT_DIR/phoenix-dapp"
DAPP_VERSION=$(node -p "require('./package.json').version")
print_info "Building phoenix-dapp@$DAPP_VERSION..."
npm run build
print_info "Publishing phoenix-dapp@$DAPP_VERSION..."
npm publish --access public
print_success "phoenix-dapp@$DAPP_VERSION published"

# Build and publish phoenix-wallet
cd "$SCRIPT_DIR/phoenix-wallet"
WALLET_VERSION=$(node -p "require('./package.json').version")
print_info "Building phoenix-wallet@$WALLET_VERSION..."
npm run build
print_info "Publishing phoenix-wallet@$WALLET_VERSION..."
npm publish --access public
print_success "phoenix-wallet@$WALLET_VERSION published"

echo ""
print_success "All packages published successfully!"
echo ""
echo "Package URLs:"
echo "  • https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-dapp"
echo "  • https://www.npmjs.com/package/@vincenttaylorlab3/phoenix-wallet"
echo ""
