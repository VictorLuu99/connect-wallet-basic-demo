#!/usr/bin/env node

/**
 * Restore workspace:* dependencies after publishing
 */

const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.join(__dirname, '../packages');
const PACKAGES = ['core', 'evm', 'aptos', 'solana', 'sui', 'privy'];

console.log('🔄 Restoring workspace:* dependencies\n');

PACKAGES.forEach((pkg) => {
  const packagePath = path.join(PACKAGES_DIR, pkg, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  let modified = false;

  // Restore dependencies
  if (packageJson.dependencies) {
    Object.keys(packageJson.dependencies).forEach((dep) => {
      if (dep.startsWith('@phoenix-wallet/') && packageJson.dependencies[dep].startsWith('^')) {
        packageJson.dependencies[dep] = 'workspace:*';
        modified = true;
        console.log(`  ✓ ${pkg}: Restored ${dep} to workspace:*`);
      }
    });
  }

  // Restore peerDependencies
  if (packageJson.peerDependencies) {
    Object.keys(packageJson.peerDependencies).forEach((dep) => {
      if (dep.startsWith('@phoenix-wallet/') && packageJson.peerDependencies[dep].startsWith('^')) {
        packageJson.peerDependencies[dep] = 'workspace:*';
        modified = true;
        console.log(`  ✓ ${pkg}: Restored peer ${dep} to workspace:*`);
      }
    });
  }

  if (modified) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  }
});

console.log('\n✅ All workspace dependencies restored!');

