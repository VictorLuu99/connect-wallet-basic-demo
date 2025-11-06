#!/bin/bash

# Build all Phoenix SDK packages

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
print_info "Building Phoenix SDKs..."
echo ""

# Build phoenix-dapp
cd "$SCRIPT_DIR/phoenix-dapp"
print_info "Building phoenix-dapp..."
npm run build
print_success "phoenix-dapp built"

# Build phoenix-wallet
cd "$SCRIPT_DIR/phoenix-wallet"
print_info "Building phoenix-wallet..."
npm run build
print_success "phoenix-wallet built"

echo ""
print_success "All packages built successfully!"
echo ""
