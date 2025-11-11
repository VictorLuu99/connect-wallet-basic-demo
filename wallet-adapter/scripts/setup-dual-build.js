#!/usr/bin/env node

/**
 * Setup dual build (ESM + CJS) for all packages
 */

const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.join(__dirname, '../packages');
const PACKAGES = ['aptos', 'solana', 'sui', 'privy'];

console.log('🔧 Setting up dual build for packages...\n');

PACKAGES.forEach((pkg) => {
  console.log(`\n📦 Processing ${pkg}...`);
  
  // Update tsconfig.json
  const tsconfigPath = path.join(PACKAGES_DIR, pkg, 'tsconfig.json');
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  
  // Update for ESM
  tsconfig.compilerOptions.outDir = './dist/esm';
  tsconfig.compilerOptions.module = 'ES2020';
  tsconfig.compilerOptions.target = 'ES2020';
  tsconfig.compilerOptions.lib = ['ES2020', 'DOM'];
  tsconfig.compilerOptions.moduleResolution = 'node';
  
  // Update paths if they exist
  if (tsconfig.compilerOptions.paths && tsconfig.compilerOptions.paths['@phoenix-wallet/core']) {
    tsconfig.compilerOptions.paths['@phoenix-wallet/core'] = ['../core/dist/esm/src'];
  }
  
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log('  ✓ Updated tsconfig.json for ESM');
  
  // Create tsconfig.cjs.json
  const tsconfigCjsPath = path.join(PACKAGES_DIR, pkg, 'tsconfig.cjs.json');
  const tsconfigCjs = {
    extends: './tsconfig.json',
    compilerOptions: {
      outDir: './dist/cjs',
      module: 'commonjs',
      target: 'ES2020'
    }
  };
  
  // Add paths for CJS if needed
  if (tsconfig.compilerOptions.paths && tsconfig.compilerOptions.paths['@phoenix-wallet/core']) {
    tsconfigCjs.compilerOptions.paths = {
      '@phoenix-wallet/core': ['../core/dist/cjs/src']
    };
  }
  
  fs.writeFileSync(tsconfigCjsPath, JSON.stringify(tsconfigCjs, null, 2) + '\n');
  console.log('  ✓ Created tsconfig.cjs.json');
  
  // Update package.json
  const packageJsonPath = path.join(PACKAGES_DIR, pkg, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Determine the correct path based on package structure
  let srcPath = 'src';
  if (pkg === 'privy') {
    // Privy might have different structure
    srcPath = 'src';
  }
  
  // Update main, module, types
  packageJson.main = `./dist/cjs/${srcPath}/index.js`;
  packageJson.module = `./dist/esm/${srcPath}/index.js`;
  packageJson.types = `./dist/esm/${srcPath}/index.d.ts`;
  
  // Update exports
  packageJson.exports = {
    '.': {
      import: {
        types: `./dist/esm/${srcPath}/index.d.ts`,
        default: `./dist/esm/${srcPath}/index.js`
      },
      require: {
        types: `./dist/cjs/${srcPath}/index.d.ts`,
        default: `./dist/cjs/${srcPath}/index.js`
      }
    }
  };
  
  // Add sideEffects
  packageJson.sideEffects = false;
  
  // Update build scripts
  packageJson.scripts.build = 'npm run build:esm && npm run build:cjs';
  packageJson.scripts['build:esm'] = 'tsc';
  packageJson.scripts['build:cjs'] = 'tsc --project tsconfig.cjs.json';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('  ✓ Updated package.json');
});

console.log('\n✅ All packages configured for dual build!');
console.log('\nNext steps:');
console.log('  1. Run: npm run packages:clean');
console.log('  2. Run: npm run packages:build');
console.log('  3. Test the build output');

