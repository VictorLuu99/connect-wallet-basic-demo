#!/bin/bash

# Clean all Phoenix SDK packages

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
print_info "Cleaning Phoenix SDKs..."
echo ""

# Clean phoenix-dapp
cd "$SCRIPT_DIR/phoenix-dapp"
print_info "Cleaning phoenix-dapp..."
npm run clean
print_success "phoenix-dapp cleaned"

# Clean phoenix-wallet
cd "$SCRIPT_DIR/phoenix-wallet"
print_info "Cleaning phoenix-wallet..."
npm run clean
print_success "phoenix-wallet cleaned"

echo ""
print_success "All packages cleaned!"
echo ""
