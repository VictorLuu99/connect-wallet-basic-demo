#!/usr/bin/env node

/**
 * Prepare packages for publishing to npm
 * This script updates workspace:* dependencies to actual versions
 */

const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.join(__dirname, '../packages');
const PACKAGES = ['core', 'evm', 'aptos', 'solana', 'sui', 'privy'];

// Read version from core package (assuming all packages have same version)
const corePackageJson = JSON.parse(
  fs.readFileSync(path.join(PACKAGES_DIR, 'core/package.json'), 'utf8')
);
const CURRENT_VERSION = corePackageJson.version;

console.log(`📦 Preparing packages for publishing (version: ${CURRENT_VERSION})\n`);

PACKAGES.forEach((pkg) => {
  const packagePath = path.join(PACKAGES_DIR, pkg, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  let modified = false;

  // Update dependencies
  if (packageJson.dependencies) {
    Object.keys(packageJson.dependencies).forEach((dep) => {
      if (dep.startsWith('@phoenix-wallet/') && packageJson.dependencies[dep] === 'workspace:*') {
        packageJson.dependencies[dep] = `^${CURRENT_VERSION}`;
        modified = true;
        console.log(`  ✓ ${pkg}: Updated ${dep} to ^${CURRENT_VERSION}`);
      }
    });
  }

  // Update peerDependencies
  if (packageJson.peerDependencies) {
    Object.keys(packageJson.peerDependencies).forEach((dep) => {
      if (dep.startsWith('@phoenix-wallet/') && packageJson.peerDependencies[dep] === 'workspace:*') {
        packageJson.peerDependencies[dep] = `^${CURRENT_VERSION}`;
        modified = true;
        console.log(`  ✓ ${pkg}: Updated peer ${dep} to ^${CURRENT_VERSION}`);
      }
    });
  }

  if (modified) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  }
});

console.log('\n✅ All packages prepared for publishing!');
console.log('\n⚠️  Remember to restore workspace:* after publishing by running:');
console.log('   npm run restore-workspace');

