#!/usr/bin/env node

/**
 * Check package integrity before publishing
 * Verifies that all dependencies are properly configured
 */

const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.join(__dirname, '../packages');
const PACKAGES = ['core', 'evm', 'aptos', 'solana', 'sui', 'privy'];

console.log('🔍 Checking package integrity...\n');

let hasErrors = false;

PACKAGES.forEach((pkg) => {
  const packagePath = path.join(PACKAGES_DIR, pkg, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log(`\n📦 ${packageJson.name}@${packageJson.version}`);
  
  // Check if dist folder exists
  const distPath = path.join(PACKAGES_DIR, pkg, 'dist');
  if (!fs.existsSync(distPath)) {
    console.error(`  ❌ dist folder not found! Run 'npm run packages:build' first`);
    hasErrors = true;
  } else {
    console.log(`  ✓ dist folder exists`);
  }
  
  // Check dependencies
  if (packageJson.dependencies) {
    console.log(`\n  Dependencies:`);
    Object.keys(packageJson.dependencies).forEach((dep) => {
      const version = packageJson.dependencies[dep];
      if (dep.startsWith('@phoenix-wallet/')) {
        if (version === 'workspace:*') {
          console.error(`    ❌ ${dep}: ${version} (should be converted to actual version)`);
          hasErrors = true;
        } else {
          console.log(`    ✓ ${dep}: ${version}`);
        }
      } else {
        // Check if external dependency exists in node_modules or is valid
        console.log(`    • ${dep}: ${version}`);
      }
    });
  }
  
  // Check peerDependencies
  if (packageJson.peerDependencies) {
    console.log(`\n  Peer Dependencies:`);
    Object.keys(packageJson.peerDependencies).forEach((dep) => {
      const version = packageJson.peerDependencies[dep];
      if (dep.startsWith('@phoenix-wallet/')) {
        if (version === 'workspace:*') {
          console.error(`    ❌ ${dep}: ${version} (should be converted to actual version)`);
          hasErrors = true;
        } else {
          console.log(`    ✓ ${dep}: ${version}`);
        }
      } else {
        console.log(`    • ${dep}: ${version}`);
      }
    });
  }
  
  // Check exports
  if (packageJson.exports) {
    console.log(`\n  Exports:`);
    Object.keys(packageJson.exports).forEach((exp) => {
      const expConfig = packageJson.exports[exp];
      if (typeof expConfig === 'object') {
        // Check import (ESM)
        if (expConfig.import) {
          const importConfig = expConfig.import;
          if (typeof importConfig === 'object') {
            // New format: { types: ..., default: ... }
            if (importConfig.default) {
              const importPath = path.join(PACKAGES_DIR, pkg, importConfig.default);
              if (fs.existsSync(importPath)) {
                console.log(`    ✓ ${exp} (import) -> ${importConfig.default}`);
              } else {
                console.error(`    ❌ ${exp} (import) -> ${importConfig.default} (file not found)`);
                hasErrors = true;
              }
            }
            if (importConfig.types) {
              const typesPath = path.join(PACKAGES_DIR, pkg, importConfig.types);
              if (fs.existsSync(typesPath)) {
                console.log(`    ✓ ${exp} (import types) -> ${importConfig.types}`);
              } else {
                console.error(`    ❌ ${exp} (import types) -> ${importConfig.types} (file not found)`);
                hasErrors = true;
              }
            }
          } else {
            // Old format: direct path
            const importPath = path.join(PACKAGES_DIR, pkg, importConfig);
            if (fs.existsSync(importPath)) {
              console.log(`    ✓ ${exp} (import) -> ${importConfig}`);
            } else {
              console.error(`    ❌ ${exp} (import) -> ${importConfig} (file not found)`);
              hasErrors = true;
            }
          }
        }
        
        // Check require (CJS)
        if (expConfig.require) {
          const requireConfig = expConfig.require;
          if (typeof requireConfig === 'object') {
            if (requireConfig.default) {
              const requirePath = path.join(PACKAGES_DIR, pkg, requireConfig.default);
              if (fs.existsSync(requirePath)) {
                console.log(`    ✓ ${exp} (require) -> ${requireConfig.default}`);
              } else {
                console.error(`    ❌ ${exp} (require) -> ${requireConfig.default} (file not found)`);
                hasErrors = true;
              }
            }
            if (requireConfig.types) {
              const typesPath = path.join(PACKAGES_DIR, pkg, requireConfig.types);
              if (fs.existsSync(typesPath)) {
                console.log(`    ✓ ${exp} (require types) -> ${requireConfig.types}`);
              } else {
                console.error(`    ❌ ${exp} (require types) -> ${requireConfig.types} (file not found)`);
                hasErrors = true;
              }
            }
          }
        }
        
        // Check old-style types field
        if (expConfig.types && typeof expConfig.types === 'string') {
          const typesPath = path.join(PACKAGES_DIR, pkg, expConfig.types);
          if (fs.existsSync(typesPath)) {
            console.log(`    ✓ types -> ${expConfig.types}`);
          } else {
            console.error(`    ❌ types -> ${expConfig.types} (file not found)`);
            hasErrors = true;
          }
        }
      }
    });
  }
  
  // Check main, module, and types fields
  console.log(`\n  Package Fields:`);
  
  if (packageJson.main) {
    const mainPath = path.join(PACKAGES_DIR, pkg, packageJson.main);
    if (fs.existsSync(mainPath)) {
      console.log(`    ✓ main (CJS): ${packageJson.main}`);
    } else {
      console.error(`    ❌ main (CJS): ${packageJson.main} (file not found)`);
      hasErrors = true;
    }
  }
  
  if (packageJson.module) {
    const modulePath = path.join(PACKAGES_DIR, pkg, packageJson.module);
    if (fs.existsSync(modulePath)) {
      console.log(`    ✓ module (ESM): ${packageJson.module}`);
    } else {
      console.error(`    ❌ module (ESM): ${packageJson.module} (file not found)`);
      hasErrors = true;
    }
  }
  
  if (packageJson.types) {
    const typesPath = path.join(PACKAGES_DIR, pkg, packageJson.types);
    if (fs.existsSync(typesPath)) {
      console.log(`    ✓ types: ${packageJson.types}`);
    } else {
      console.error(`    ❌ types: ${packageJson.types} (file not found)`);
      hasErrors = true;
    }
  }
  
  // Check sideEffects field
  if (packageJson.sideEffects !== undefined) {
    console.log(`    ✓ sideEffects: ${packageJson.sideEffects}`);
  } else {
    console.log(`    ⚠️  sideEffects: not set (consider adding for tree-shaking)`);
  }
});

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.error('\n❌ Package integrity check FAILED!');
  console.error('\nPlease fix the errors above before publishing.');
  process.exit(1);
} else {
  console.log('\n✅ All packages are ready for publishing!');
  process.exit(0);
}

