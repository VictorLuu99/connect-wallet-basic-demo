const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default Expo config
const config = getDefaultConfig(__dirname);

// Add support for local packages (phoenix-wallet)
const phoenixWalletPath = path.resolve(__dirname, '../packages/phoenix-wallet');

// Watch additional folders for changes
config.watchFolders = [phoenixWalletPath];

// Add node_modules from phoenix-wallet to resolution
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(phoenixWalletPath, 'node_modules'),
];

// Ensure proper source extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx'];

module.exports = config;
